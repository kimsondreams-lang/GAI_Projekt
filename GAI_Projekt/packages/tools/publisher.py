import os
import asyncio
import tempfile
import json
import xml.etree.ElementTree as ET
from datetime import datetime
from ftplib import FTP, error_perm
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
import logging
import hashlib
from pathlib import Path

logger = logging.getLogger(__name__)

@dataclass
class PublishConfig:
    """Konfiguracja publikacji"""
    ftp_host: str
    ftp_user: str
    ftp_pass: str
    base_dir: str = "public_html/kimsondreams/data/articles"
    backup_dir: str = "public_html/kimsondreams/data/backups"
    sitemap_path: str = "public_html/kimsondreams/sitemap.xml"
    atomic_deployment: bool = True
    max_retries: int = 3
    timeout: int = 30

class FTPPublisher:
    """Zaawansowany FTP Publisher z atomic deployment i zarządzaniem plikami"""
    
    def __init__(self, config: PublishConfig):
        self.config = config
        self._staging: Dict[str, Dict[str, Any]] = {}
        self.deployment_lock = asyncio.Lock()
        
    async def test_connection(self) -> Dict[str, Any]:
        """Testuj połączenie FTP"""
        try:
            with FTP(self.config.ftp_host, timeout=self.config.timeout) as ftp:
                ftp.login(self.config.ftp_user, self.config.ftp_pass)
                ftp.cwd(self.config.base_dir)
                return {"ok": True, "message": "Połączenie FTP działa"}
        except Exception as e:
            return {"ok": False, "error": f"Błąd połączenia FTP: {str(e)}"}
    
    async def create_backup(self, slug: str) -> Dict[str, Any]:
        """Utwórz kopię zapasową istniejących plików"""
        try:
            with FTP(self.config.ftp_host, timeout=self.config.timeout) as ftp:
                ftp.login(self.config.ftp_user, self.config.ftp_pass)
                
                # Utwórz katalog backup
                backup_timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
                backup_dir = f"{self.config.backup_dir}/{slug}_{backup_timestamp}"
                
                try:
                    ftp.mkd(backup_dir)
                except error_perm:
                    pass  # Katalog może już istnieć
                
                # Skopiuj istniejące pliki
                files_to_backup = [
                    f"{slug}.md",
                    f"{slug}.schema.json", 
                    f"{slug}.meta.json"
                ]
                
                backed_up_files = []
                for filename in files_to_backup:
                    try:
                        # Sprawdź czy plik istnieje
                        ftp.size(f"{self.config.base_dir}/{filename}")
                        
                        # Skopiuj plik do backupu
                        with tempfile.NamedTemporaryFile(delete=False) as tmp:
                            with open(tmp.name, 'wb') as f:
                                ftp.retrbinary(f"RETR {self.config.base_dir}/{filename}", f.write)
                            
                            # Wgraj do katalogu backup
                            with open(tmp.name, 'rb') as f:
                                ftp.storbinary(f"STOR {backup_dir}/{filename}", f)
                            
                            backed_up_files.append(filename)
                    except error_perm:
                        continue  # Plik nie istnieje, pomijamy
                
                return {"ok": True, "backup_dir": backup_dir, "files": backed_up_files}
                
        except Exception as e:
            return {"ok": False, "error": f"Błąd tworzenia backupu: {str(e)}"}
    
    def stage_article_package(self, article: Dict[str, Any]):
        """Przygotuj paczkę artykułu do publikacji"""
        article_hash = hashlib.md5(article["content"].encode()).hexdigest()[:8]
        
        self._staging[article["slug"]] = {
            "files": [
                (f"{article['slug']}.md", article["content"].encode("utf-8")),
                (f"{article['slug']}.schema.json", article["schema"].encode("utf-8")),
                (f"{article['slug']}.meta.json", json.dumps(article["meta"], ensure_ascii=False).encode("utf-8"))
            ],
            "title": article["title"],
            "hash": article_hash,
            "timestamp": datetime.utcnow().isoformat(),
            "meta": article.get("meta", {}),
            "status": "staged"
        }
        
        logger.info(f"Przygotowano paczkę artykułu: {article['slug']} (hash: {article_hash})")
    
    async def upload_files_atomic(self, slug: str, temp_suffix: str = "_tmp") -> Dict[str, Any]:
        """Wgraj pliki atomowo (najpierw do katalogu tymczasowego)"""
        pkg = self._staging.get(slug)
        if not pkg:
            return {"ok": False, "error": "Brak przygotowanej paczki"}
        
        try:
            with FTP(self.config.ftp_host, timeout=self.config.timeout) as ftp:
                ftp.login(self.config.ftp_user, self.config.ftp_pass)
                
                # Utwórz katalog tymczasowy
                temp_dir = f"{self.config.base_dir}{temp_suffix}"
                try:
                    ftp.mkd(temp_dir)
                except error_perm:
                    pass  # Katalog może już istnieć
                
                uploaded_files = []
                
                # Wgraj pliki do katalogu tymczasowego
                for fname, content in pkg["files"]:
                    with tempfile.NamedTemporaryFile(delete=False) as tmp:
                        tmp.write(content)
                        tmp.flush()
                        
                        # Wgraj do katalogu tymczasowego
                        with open(tmp.name, "rb") as fh:
                            ftp.storbinary(f"STOR {temp_dir}/{fname}", fh)
                        
                        uploaded_files.append(fname)
                        logger.info(f"Wgrano plik (tymczasowo): {fname}")
                
                return {
                    "ok": True, 
                    "files": uploaded_files,
                    "temp_dir": temp_dir,
                    "message": "Pliki wgrane tymczasowo"
                }
                
        except Exception as e:
            return {"ok": False, "error": f"Błąd wgrywania plików: {str(e)}"}
    
    async def atomic_deploy(self, slug: str) -> Dict[str, Any]:
        """Atomowe wdrożenie (przeniesienie z katalogu tymczasowego)"""
        try:
            with FTP(self.config.ftp_host, timeout=self.config.timeout) as ftp:
                ftp.login(self.config.ftp_user, self.config.ftp_pass)
                
                temp_dir = f"{self.config.base_dir}_tmp"
                
                # Przenieś pliki z katalogu tymczasowego do docelowego
                files_to_move = [
                    f"{slug}.md",
                    f"{slug}.schema.json",
                    f"{slug}.meta.json"
                ]
                
                moved_files = []
                for filename in files_to_move:
                    try:
                        # Sprawdź czy plik istnieje w katalogu tymczasowym
                        ftp.size(f"{temp_dir}/{filename}")
                        
                        # Usuń stary plik (jeśli istnieje)
                        try:
                            ftp.delete(f"{self.config.base_dir}/{filename}")
                        except error_perm:
                            pass  # Plik nie istnieje, OK
                        
                        # Przenieś plik
                        ftp.rename(f"{temp_dir}/{filename}", f"{self.config.base_dir}/{filename}")
                        moved_files.append(filename)
                        logger.info(f"Atomowo wdrożono plik: {filename}")
                        
                    except error_perm as e:
                        logger.warning(f"Nie można przenieść pliku {filename}: {e}")
                        continue
                
                return {
                    "ok": True,
                    "files": moved_files,
                    "message": f"Atomowe wdrożenie zakończone: {len(moved_files)} plików"
                }
                
        except Exception as e:
            return {"ok": False, "error": f"Błąd atomowego wdrożenia: {str(e)}"}
    
    async def publish_article_package(self, slug: str) -> Dict[str, Any]:
        """Opublikuj paczkę artykułu z pełnym zarządzaniem"""
        async with self.deployment_lock:
            try:
                pkg = self._staging.get(slug)
                if not pkg:
                    return {"ok": False, "error": "Brak przygotowanej paczki"}
                
                logger.info(f"Rozpoczynam publikację artykułu: {slug}")
                
                # Testuj połączenie
                connection_test = await self.test_connection()
                if not connection_test["ok"]:
                    return connection_test
                
                # Utwórz backup (opcjonalnie)
                backup_result = await self.create_backup(slug)
                if not backup_result["ok"]:
                    logger.warning(f"Nie udało się utworzyć backupu: {backup_result.get('error')}")
                
                # Wgraj pliki tymczasowo
                upload_result = await self.upload_files_atomic(slug)
                if not upload_result["ok"]:
                    return upload_result
                
                # Atomowe wdrożenie
                if self.config.atomic_deployment:
                    deploy_result = await self.atomic_deploy(slug)
                    if not deploy_result["ok"]:
                        return deploy_result
                
                # Aktualizuj status
                self._staging[slug]["status"] = "published"
                self._staging[slug]["published_at"] = datetime.utcnow().isoformat()
                
                # Zaktualizuj sitemapę (asynchronicznie)
                asyncio.create_task(self.update_sitemap(slug, pkg["title"]))
                
                logger.info(f"Pomyślnie opublikowano artykuł: {slug}")
                
                return {
                    "ok": True,
                    "slug": slug,
                    "title": pkg["title"],
                    "files": [f for f, _ in pkg["files"]],
                    "published_at": self._staging[slug]["published_at"],
                    "backup_created": backup_result.get("backup_dir") if backup_result["ok"] else None
                }
                
            except Exception as e:
                logger.error(f"Błąd publikacji artykułu {slug}: {e}")
                return {"ok": False, "error": f"Błąd publikacji: {str(e)}"}
    
    async def update_sitemap(self, slug: str, title: str) -> Dict[str, Any]:
        """Zaktualizuj plik sitemap.xml"""
        try:
            with FTP(self.config.ftp_host, timeout=self.config.timeout) as ftp:
                ftp.login(self.config.ftp_user, self.config.ftp_pass)
                
                # Pobierz istniejącą sitemapę
                try:
                    with tempfile.NamedTemporaryFile(delete=False) as tmp:
                        with open(tmp.name, 'wb') as f:
                            ftp.retrbinary(f"RETR {self.config.sitemap_path}", f.write)
                        
                        # Wczytaj XML
                        tree = ET.parse(tmp.name)
                        root = tree.getroot()
                    
                except error_perm:
                    # Utwórz nową sitemapę
                    root = ET.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
                    tree = ET.ElementTree(root)
                
                # Dodaj nowy URL
                url_elem = ET.SubElement(root, "url")
                ET.SubElement(url_elem, "loc").text = f"https://kimsondreams.com/articles/{slug}"
                ET.SubElement(url_elem, "lastmod").text = datetime.utcnow().strftime("%Y-%m-%d")
                ET.SubElement(url_elem, "changefreq").text = "weekly"
                ET.SubElement(url_elem, "priority").text = "0.8"
                
                # Zapisz zaktualizowaną sitemapę
                with tempfile.NamedTemporaryFile(delete=False, suffix='.xml') as tmp_out:
                    tree.write(tmp_out.name, encoding='utf-8', xml_declaration=True)
                    
                    # Wgraj zaktualizowaną sitemapę
                    with open(tmp_out.name, 'rb') as f:
                        ftp.storbinary(f"STOR {self.config.sitemap_path}", f)
                
                logger.info(f"Zaktualizowano sitemapę dla: {slug}")
                return {"ok": True, "message": "Sitemap zaktualizowana"}
                
        except Exception as e:
            logger.error(f"Błąd aktualizacji sitemap: {e}")
            return {"ok": False, "error": f"Błąd aktualizacji sitemap: {str(e)}"}
    
    async def rollback_deployment(self, slug: str, backup_dir: str) -> Dict[str, Any]:
        """Wycofaj wdrożenie do poprzedniej wersji"""
        try:
            with FTP(self.config.ftp_host, timeout=self.config.timeout) as ftp:
                ftp.login(self.config.ftp_user, self.config.ftp_pass)
                
                # Przywróć pliki z backupu
                files_to_restore = [
                    f"{slug}.md",
                    f"{slug}.schema.json",
                    f"{slug}.meta.json"
                ]
                
                restored_files = []
                for filename in files_to_restore:
                    try:
                        # Sprawdź czy plik istnieje w backupie
                        ftp.size(f"{backup_dir}/{filename}")
                        
                        # Przywróć plik
                        ftp.rename(f"{backup_dir}/{filename}", f"{self.config.base_dir}/{filename}")
                        restored_files.append(filename)
                        
                    except error_perm:
                        continue  # Plik nie istnieje w backupie
                
                logger.info(f"Wycofano wdrożenie artykułu: {slug}")
                
                return {
                    "ok": True,
                    "files": restored_files,
                    "message": f"Wycofano {len(restored_files)} plików"
                }
                
        except Exception as e:
            logger.error(f"Błąd wycofywania wdrożenia {slug}: {e}")
            return {"ok": False, "error": f"Błąd wycofywania: {str(e)}"}

# Globalna instancja publishera
default_publisher = None

def get_publisher() -> FTPPublisher:
    """Pobierz globalną instancję publishera"""
    global default_publisher
    
    if default_publisher is None:
        config = PublishConfig(
            ftp_host=os.environ.get("FTP_HOST", "ftp.kimsondreams.com"),
            ftp_user=os.environ.get("FTP_USER", "kimsondreams"),
            ftp_pass=os.environ.get("FTP_PASS", ""),
            base_dir=os.environ.get("FTP_BASE_DIR", "public_html/kimsondreams/data/articles"),
            atomic_deployment=os.environ.get("ATOMIC_DEPLOYMENT", "true").lower() == "true"
        )
        default_publisher = FTPPublisher(config)
    
    return default_publisher

# Zachowaj kompatybilność wsteczną
def stage_article_package(article: Dict[str, Any]):
    """Stwórz paczkę artykułu (kompatybilność wsteczna)"""
    publisher = get_publisher()
    publisher.stage_article_package(article)

def publish_article_package(slug: str):
    """Opublikuj artykuł (kompatybilność wsteczna)"""
    publisher = get_publisher()
    result = asyncio.run(publisher.publish_article_package(slug))
    return result
