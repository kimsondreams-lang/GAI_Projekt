
import React, { useState, useEffect, useContext, useRef } from 'react';
import { FileText, Edit3, Trash2, RefreshCw, Save, Image as ImageIcon, Wand2, Plus, ArrowLeft, Loader2, DownloadCloud, ExternalLink, Code, Eye, EyeOff, MonitorPlay, MousePointerClick, X, CheckSquare, Search, ChevronUp, ChevronDown, GripVertical } from 'lucide-react';
import { generateBlogPost, rewriteArticleText, rewriteFullArticleHtml, rewriteHtmlFragment, visualizeProduct } from '../../services/aiService';
import { ftpService } from '../../services/ftpService';
import { db } from '../../services/memoryService';
import { AppContext } from '../../contexts/AppContext';
import { AppId } from '../../types';

const NeuTab = ({ id, icon: Icon, label, activeTab, setActiveTab }: { id: string; icon: any; label: string; activeTab: string; setActiveTab: (id: string) => void }) => (
    <button 
        onClick={() => setActiveTab(id)}
        className={`flex-1 py-4 flex items-center justify-center gap-2 text-sm font-bold transition-all
          ${activeTab === id 
              ? 'text-blue-400 shadow-neu-pressed bg-neu-base border-t-2 border-blue-400' 
              : 'text-neu-muted shadow-neu-flat bg-neu-base hover:text-neu-text'
          } first:rounded-tl-xl last:rounded-tr-xl`}
    >
        <Icon size={16} />
        {label}
    </button>
);

export const BlogManager: React.FC = () => {
  const { showModal, setAppMenu, activeWindowId } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState<'list' | 'editor' | 'visualizer'>('list');

  const settings = db.getSettings();
  const ARTICLES_ROOT = `${settings.ftpConfig.rootPath}/data/articles`.replace('//', '/');
  const IMAGES_ROOT = `${settings.ftpConfig.rootPath}/images/articles`.replace('//', '/');
  // Use relative path for preview to leverage local server (public/ folder)
  const PUBLIC_IMG_BASE = ''; 

  const [articles, setArticles] = useState<any[]>([]);
  const [visibleArticles, setVisibleArticles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [maintenanceFileLoading, setMaintenanceFileLoading] = useState<string | null>(null);
  const [articleInfo, setArticleInfo] = useState<Record<string, { title: string; date: string }>>({});
  const [currentFile, setCurrentFile] = useState<{name: string, content: string} | null>(null);
  const [articleMeta, setArticleMeta] = useState<any | null>(null);
  
  const [editorContent, setEditorContent] = useState('');
  const [viewMode, setViewMode] = useState<'visual' | 'source'>('visual'); 
  type EditorBlockType = 'h1' | 'h2' | 'h3' | 'p' | 'ul' | 'ol' | 'blockquote' | 'img' | 'imgSlot' | 'html';
  type EditorBlock = {
      id: string;
      type: EditorBlockType;
      text?: string;
      items?: string[];
      src?: string;
      alt?: string;
      html?: string;
  };
  const [editorBlocks, setEditorBlocks] = useState<EditorBlock[]>([]);
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [activeInlineBlockId, setActiveInlineBlockId] = useState<string | null>(null);
  const inlineRefs = useRef(new Map<string, HTMLDivElement>());
  const [rewriteInstruction, setRewriteInstruction] = useState('');
  const [selection, setSelection] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [selectionHtml, setSelectionHtml] = useState('');
  
  const [showImgModal, setShowImgModal] = useState(false);
  const [activeImgSlotId, setActiveImgSlotId] = useState<string | null>(null);
  const [productName, setProductName] = useState('');
  const [environment, setEnvironment] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedImageSource, setGeneratedImageSource] = useState<'ai' | 'pexels' | 'url'>('ai');
  const [genLoading, setGenLoading] = useState(false);
  const [pexelsQuery, setPexelsQuery] = useState('');
  const [pexelsResults, setPexelsResults] = useState<any[]>([]);
  const [pexelsLoading, setPexelsLoading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const blocksSyncLockRef = useRef(false);

  const getHeaders = () => {
      return {
          'Content-Type': 'application/json'
      };
  };

  const extractTitleFromHtml = (html: string) => {
      if (!html) return '';
      try {
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const h1 = doc.querySelector('h1');
          const text = (h1?.textContent || '').trim();
          return text;
      } catch {
          const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
          return (match?.[1] || '').replace(/<[^>]+>/g, '').trim();
      }
  };

  const getSlugFromFileName = (name: string) => name.replace(/\.json$/i, '');

  const buildArticleMeta = (fileName: string, html: string, existing?: any) => {
      const today = new Date().toISOString().slice(0, 10);
      const slug = getSlugFromFileName(fileName);
      const titleFromHtml = extractTitleFromHtml(html);
      return {
          ...existing,
          id: existing?.id || slug,
          title: existing?.title || titleFromHtml || slug,
          date: existing?.date || today,
          content: html
      };
  };

  const publishArticle = async (fileName: string, article: any) => {
      const res = await fetch('/api/blog/publish', {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ fileName, article })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Publish Failed');
      return await res.json();
  };

  const deleteArticleRemote = async (fileName: string) => {
      const res = await fetch('/api/blog/delete', {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ fileName })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Delete Failed');
      return await res.json();
  };

  useEffect(() => {
    if (activeWindowId === AppId.BLOG_MANAGER) {
        setAppMenu([
            {
                label: 'File',
                items: [
                    { label: 'New Article', action: handleNewArticle, shortcut: '⌘N' },
                    { label: 'Save Article', action: handleSaveArticle, disabled: !currentFile, shortcut: '⌘S' },
                    { label: 'Refresh List', action: fetchArticles, shortcut: '⌘R' }
                ]
            },
            {
                label: 'Tools',
                items: [
                    { label: 'Auto-fix All Images', action: () => handleAutoFixImages() },
                    { label: 'Preview Local Site', action: handleOpenLocalPreview }
                ]
            }
        ]);
    }
  }, [activeWindowId, currentFile]);

  useEffect(() => {
      if (activeTab === 'list') {
          fetchArticles();
      }
  }, [activeTab]);

  const fetchArticles = async () => {
      setLoading(true);
      try {
          await ftpService.createDir(ARTICLES_ROOT);
          await ftpService.createDir(IMAGES_ROOT);
          
          const files = await ftpService.listFiles(ARTICLES_ROOT);
          const articleFiles = files.filter(f => !f.isDirectory && /\.json$/i.test(f.name) && f.name !== 'index.json');
          setArticles(articleFiles);
          setTimeout(() => {
              prefetchArticleInfo(articleFiles.map(f => f.name));
          }, 0);

          // FETCH INDEX FOR VISIBILITY
          try {
              const localIndex = `/tmp/articles/index.json`;
              await ftpService.download(`${ARTICLES_ROOT}/index.json`, '/tmp/articles');
              const idxContent = await db.fetchFileContent(localIndex);
              if (idxContent) {
                  const parsed = JSON.parse(idxContent);
                  if (Array.isArray(parsed)) setVisibleArticles(parsed);
              }
          } catch (idxErr) {
              console.warn("Index fetch failed (maybe new blog?):", idxErr);
              setVisibleArticles([]);
          }
      } catch (e: any) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const prefetchArticleInfo = async (fileNames: string[]) => {
      const names = Array.from(new Set((fileNames || []).map(n => String(n || '').trim()).filter(Boolean)));
      const missing = names.filter(n => !articleInfo[n]);
      if (missing.length === 0) return;

      const concurrency = 3;
      let idx = 0;
      const workers = Array.from({ length: concurrency }, async () => {
          while (idx < missing.length) {
              const current = missing[idx];
              idx += 1;
              try {
                  const tempPath = `/tmp/articles/${current}`;
                  await ftpService.download(`${ARTICLES_ROOT}/${current}`, '/tmp/articles');
                  const content = await db.fetchFileContent(tempPath);
                  if (!content) continue;
                  const parsed = JSON.parse(content);
                  const html = typeof parsed?.content === 'string' ? parsed.content : '';
                  const title = String(parsed?.title || extractTitleFromHtml(html) || '').trim();
                  const date = String(parsed?.date || '').trim();
                  if (!title && !date) continue;
                  setArticleInfo(prev => (prev[current] ? prev : { ...prev, [current]: { title, date } }));
              } catch {
              }
          }
      });
      await Promise.all(workers);
  };

  const handleAutoFixImages = async (fileName?: string) => {
      const target = String(fileName || '').trim();
      if (target) setMaintenanceFileLoading(target);
      else setMaintenanceLoading(true);
      try {
          const res = await fetch('/api/blog/maintenance/images', {
              method: 'POST',
              headers: getHeaders(),
              body: JSON.stringify(target ? { fileName: target } : {})
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error || 'Maintenance failed');
          const details = `Checked: ${data.checked}\nFixed images: ${data.fixedImages}\nErrors: ${(data.errors || []).length}`;
          showModal('success', target ? 'Fix Images (Article)' : 'Blog Maintenance', details);
          await fetchArticles();
      } catch (e: any) {
          showModal('error', 'Blog Maintenance Failed', e.message || 'Maintenance failed');
      } finally {
          if (target) setMaintenanceFileLoading(null);
          else setMaintenanceLoading(false);
      }
  };

  const handleOpenArticle = async (filename: string) => {
      setLoading(true);
      try {
          const tempPath = `/tmp/articles/${filename}`;
          await ftpService.download(`${ARTICLES_ROOT}/${filename}`, '/tmp/articles');
          const content = await db.fetchFileContent(tempPath);
          if (!content) throw new Error("Empty file content");

          const parsed = JSON.parse(content);
          const html = typeof parsed?.content === 'string' ? parsed.content : '';
          if (!html) throw new Error("Invalid article content");

          setArticleMeta(parsed);
          setCurrentFile({ name: filename, content: html });
          setEditorContent(html);
          setEditorBlocks(parseHtmlToBlocks(html));
          setActiveTab('editor');
          setViewMode('visual'); 
      } catch (e: any) {
          showModal('error', 'Read Error', e.message);
      } finally {
          setLoading(false);
      }
  };

  const escapeHtmlText = (value: string) => String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const escapeAttr = (value: string) => escapeHtmlText(value).replace(/\n/g, ' ');

  const sanitizeInlineHtml = (raw: string) => {
      const input = String(raw || '');
      const doc = new DOMParser().parseFromString(`<div>${input}</div>`, 'text/html');
      const container = doc.body.firstElementChild as HTMLElement | null;
      if (!container) return '';
      const allowedTags = new Set(['A', 'STRONG', 'B', 'EM', 'I', 'CODE', 'BR', 'SPAN']);
      const isSafeHref = (href: string) => {
          const h = String(href || '').trim();
          if (!h) return false;
          if (h.startsWith('#') || h.startsWith('/')) return true;
          return /^https?:\/\//i.test(h) || /^mailto:/i.test(h) || /^tel:/i.test(h);
      };
      const walk = (node: Node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node as HTMLElement;
              if (!allowedTags.has(el.tagName)) {
                  const frag = doc.createDocumentFragment();
                  Array.from(el.childNodes).forEach(child => {
                      walk(child);
                      frag.appendChild(child);
                  });
                  el.replaceWith(frag);
                  return;
              }
              if (el.tagName === 'A') {
                  const href = el.getAttribute('href') || '';
                  if (!isSafeHref(href)) el.removeAttribute('href');
                  el.removeAttribute('style');
                  el.removeAttribute('onclick');
                  el.setAttribute('rel', 'nofollow');
                  el.setAttribute('target', '_blank');
              } else {
                  el.removeAttribute('style');
                  el.removeAttribute('onclick');
              }
              Array.from(el.attributes).forEach(attr => {
                  const n = attr.name.toLowerCase();
                  if (n.startsWith('on')) el.removeAttribute(attr.name);
              });
          }
          Array.from(node.childNodes).forEach(walk);
      };
      walk(container);
      const html = container.innerHTML
          .replace(/\u00a0/g, ' ')
          .replace(/<b\b/gi, '<strong')
          .replace(/<\/b>/gi, '</strong>')
          .replace(/<i\b/gi, '<em')
          .replace(/<\/i>/gi, '</em>')
          .trim();
      return html;
  };

  const parseHtmlToBlocks = (html: string): EditorBlock[] => {
      const cleaned = String(html || '').trim();
      if (!cleaned) return [];
      const blocks: EditorBlock[] = [];
      const doc = new DOMParser().parseFromString(cleaned, 'text/html');
      const nodes = Array.from(doc.body.childNodes);
      nodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
              const t = String(node.textContent || '').trim();
              if (t) blocks.push({ id: `b_${Date.now()}_${Math.random()}`, type: 'p', html: escapeHtmlText(t) });
              return;
          }
          if (!(node instanceof HTMLElement)) return;
          const tag = node.tagName.toLowerCase();
          const id = `b_${Date.now()}_${Math.random()}`;
          if (tag === 'h1') blocks.push({ id, type: 'h1', text: (node.textContent || '').trim() });
          else if (tag === 'h2') blocks.push({ id, type: 'h2', text: (node.textContent || '').trim() });
          else if (tag === 'h3') blocks.push({ id, type: 'h3', text: (node.textContent || '').trim() });
          else if (tag === 'p') blocks.push({ id, type: 'p', html: sanitizeInlineHtml(node.innerHTML || '') || escapeHtmlText((node.textContent || '').trim()) });
          else if (tag === 'blockquote') blocks.push({ id, type: 'blockquote', html: sanitizeInlineHtml(node.innerHTML || '') || escapeHtmlText((node.textContent || '').trim()) });
          else if (tag === 'ul') {
              const items = Array.from(node.querySelectorAll('li')).map(li => String(li.textContent || '').trim()).filter(Boolean);
              blocks.push({ id, type: 'ul', items });
          } else if (tag === 'ol') {
              const items = Array.from(node.querySelectorAll('li')).map(li => String(li.textContent || '').trim()).filter(Boolean);
              blocks.push({ id, type: 'ol', items });
          } else if (tag === 'img') {
              blocks.push({ id, type: 'img', src: String(node.getAttribute('src') || ''), alt: String(node.getAttribute('alt') || '') });
          } else if (tag === 'div' && node.classList.contains('technova-img-slot')) {
              blocks.push({ id, type: 'imgSlot', html: node.outerHTML });
          } else {
              blocks.push({ id, type: 'html', html: node.outerHTML });
          }
      });
      return blocks;
  };

  const blocksToHtml = (blocks: EditorBlock[]) => {
      const out: string[] = [];
      blocks.forEach((b) => {
          if (b.type === 'h1') out.push(`<h1>${escapeHtmlText(b.text || '')}</h1>`);
          else if (b.type === 'h2') out.push(`<h2>${escapeHtmlText(b.text || '')}</h2>`);
          else if (b.type === 'h3') out.push(`<h3>${escapeHtmlText(b.text || '')}</h3>`);
          else if (b.type === 'p') {
              const inner = sanitizeInlineHtml(String(b.html || '')) || escapeHtmlText(String(b.text || ''));
              out.push(`<p>${inner}</p>`);
          }
          else if (b.type === 'blockquote') {
              const inner = sanitizeInlineHtml(String(b.html || '')) || escapeHtmlText(String(b.text || ''));
              out.push(`<blockquote>${inner}</blockquote>`);
          }
          else if (b.type === 'ul') out.push(`<ul>${(b.items || []).map(i => `<li>${escapeHtmlText(i)}</li>`).join('')}</ul>`);
          else if (b.type === 'ol') out.push(`<ol>${(b.items || []).map(i => `<li>${escapeHtmlText(i)}</li>`).join('')}</ol>`);
          else if (b.type === 'img') {
              const src = String(b.src || '').trim();
              if (!src) return;
              out.push(`<img src="${escapeAttr(src)}" alt="${escapeAttr(String(b.alt || ''))}" class="technova-featured-img" />`);
          } else if (b.type === 'imgSlot') {
              const html = String(b.html || '').trim();
              if (html) out.push(html);
          } else {
              const html = String(b.html || '').trim();
              if (html) out.push(html);
          }
      });
      return out.join('\n\n').trim();
  };

  const applyBlocks = (next: EditorBlock[]) => {
      blocksSyncLockRef.current = true;
      setEditorBlocks(next);
      setEditorContent(blocksToHtml(next));
  };

  const addBlock = (type: EditorBlockType) => {
      const id = `b_${Date.now()}_${Math.random()}`;
      const slotId = `img-slot-${Date.now()}`;
      const block: EditorBlock =
          type === 'ul' || type === 'ol'
              ? { id, type, items: [''] }
              : type === 'img'
                  ? { id, type, src: '', alt: '' }
                  : type === 'imgSlot'
                      ? { id, type, html: `<div class="technova-img-slot" id="${slotId}" data-status="empty">
  <div class="slot-content">
    <span>🖼️ IMAGE GENERATION ZONE</span>
    <button class="generate-btn" onclick="window.dispatchEvent(new CustomEvent('technova-gen-img', { detail: '${slotId}' }))">GENERATE HERE</button>
  </div>
</div>` }
                      : (type === 'p' || type === 'blockquote')
                          ? { id, type, html: '' }
                          : { id, type, text: '' };

      applyBlocks([...(editorBlocks || []), block]);
  };

  const handleGenImageFromBlock = (block: EditorBlock, index: number) => {
      // 1. Get text content
      const rawText = block.text || block.html || (block.items || []).join(' ') || '';
      const cleanText = rawText.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
      const promptContext = cleanText.substring(0, 300);

      if (!promptContext) {
          showModal('error', 'Empty Block', 'This block has no text content to generate from.');
          return;
      }

      // 2. Prepare new slot
      const slotId = `img-slot-${Date.now()}`;
      const slotBlock: EditorBlock = { 
          id: `b_${Date.now()}_${Math.random()}`, 
          type: 'imgSlot', 
          html: `<div class="technova-img-slot" id="${slotId}" data-status="empty">
              <div class="slot-content">
                  <span>🖼️ IMAGE GENERATION ZONE</span>
                  <button class="generate-btn" onclick="window.dispatchEvent(new CustomEvent('technova-gen-img', { detail: '${slotId}' }))">GENERATE HERE</button>
              </div>
          </div>` 
      };

      // 3. Insert slot after current block
      const nextBlocks = [...editorBlocks];
      nextBlocks.splice(index + 1, 0, slotBlock);
      applyBlocks(nextBlocks);

      // 4. Open modal with pre-filled context
      // We need to wait for state update, but we can set modal state directly
      setActiveImgSlotId(slotId);
      setProductName(''); // Let user decide subject or keep empty
      setEnvironment(`Context: ${promptContext}. High quality, realistic, cinematic lighting.`);
      setShowImgModal(true);
  };

  const moveBlock = (index: number, dir: -1 | 1) => {
      const next = [...(editorBlocks || [])];
      const target = index + dir;
      if (target < 0 || target >= next.length) return;
      const tmp = next[index];
      next[index] = next[target];
      next[target] = tmp;
      applyBlocks(next);
  };

  const moveBlockTo = (fromIndex: number, toIndex: number) => {
      const list = [...(editorBlocks || [])];
      if (fromIndex < 0 || fromIndex >= list.length) return;
      if (toIndex < 0 || toIndex >= list.length) return;
      if (fromIndex === toIndex) return;
      const [item] = list.splice(fromIndex, 1);
      const insertAt = fromIndex < toIndex ? toIndex - 1 : toIndex;
      list.splice(insertAt, 0, item);
      applyBlocks(list);
  };

  const deleteBlock = (index: number) => {
      const next = (editorBlocks || []).filter((_, i) => i !== index);
      applyBlocks(next);
  };

  const patchBlock = (index: number, patch: Partial<EditorBlock>) => {
      const next = [...(editorBlocks || [])];
      next[index] = { ...next[index], ...patch };
      applyBlocks(next);
  };

  useEffect(() => {
      if (viewMode !== 'visual') return;
      setEditorBlocks(parseHtmlToBlocks(editorContent));
  }, [viewMode]);

  useEffect(() => {
      if (viewMode !== 'visual') return;
      if (blocksSyncLockRef.current) {
          blocksSyncLockRef.current = false;
          return;
      }
      setEditorBlocks(parseHtmlToBlocks(editorContent));
  }, [editorContent, viewMode]);

  const handleSaveArticle = async () => {
      if (!currentFile) return;
      setLoading(true);
      try {
          const updated = buildArticleMeta(currentFile.name, editorContent, articleMeta || {});
          await publishArticle(currentFile.name, updated);
          setArticleMeta(updated);
          showModal('success', 'Saved', `Article ${currentFile.name} published to server.`);
      } catch (e: any) {
          showModal('error', 'Save Failed', e.message);
      } finally {
          setLoading(false);
      }
  };

  const handleToggleVisibility = async (e: React.MouseEvent, filename: string) => {
      e.stopPropagation();
      setLoading(true);
      const isVisible = visibleArticles.includes(filename);
      try {
          const res = await fetch('/api/blog/toggle-visibility', {
              method: 'POST',
              headers: getHeaders(),
              body: JSON.stringify({ fileName: filename, visible: !isVisible })
          });
          if (!res.ok) throw new Error((await res.json()).error);
          
          const data = await res.json();
          if (Array.isArray(data.index)) {
              setVisibleArticles(data.index);
          }
          // Optional: silent update or toast? Modal might be too intrusive for toggle.
          // showModal('success', 'Visibility Updated', `Article is now ${!isVisible ? 'VISIBLE' : 'HIDDEN'}`);
      } catch (err: any) {
          showModal('error', 'Update Failed', err.message);
      } finally {
          setLoading(false);
      }
  };

  const handleDeleteArticle = (filename: string) => {
      showModal('confirm', 'Delete Article', `Are you sure you want to delete ${filename}?`, async () => {
          setLoading(true);
          try {
              await deleteArticleRemote(filename);
              await fetchArticles(); 
              if (currentFile?.name === filename) {
                  setCurrentFile(null);
                  setArticleMeta(null);
                  setActiveTab('list');
              }
              showModal('success', 'Deleted', 'File removed from server.');
          } catch (e: any) {
              showModal('error', 'Delete Failed', e.message);
          } finally {
              setLoading(false);
          }
      });
  };

  const handleNewArticle = () => {
      showModal('prompt', 'New Article Topic', 'What should the article be about?', async (topic?: string) => {
          if (!topic) return;
          
          setLoading(true);
          setActiveTab('editor'); 
          setViewMode('visual');
          
          try {
              const content = await generateBlogPost(topic, undefined, settings.amazonTag);
              const slugBase = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              const slug = `${slugBase}.json`;
              const baseMeta = { id: slugBase, title: topic, author: 'Technova Team', date: new Date().toISOString().slice(0, 10), category: 'NEWS', tags: [] };
              const prepared = buildArticleMeta(slug, content, baseMeta);
              setArticleMeta(prepared);
              setCurrentFile({ name: slug, content });
              setEditorContent(content);
              setLoading(false); 
              await publishArticle(slug, prepared);
              
          } catch (e: any) {
              showModal('error', 'Generation Failed', e.message);
              setLoading(false);
              setActiveTab('list');
          }
      });
  };

  const handleRewriteSelection = async () => {
      if (!selection) {
          showModal('info', 'No Selection', 'Please select text to rewrite.');
          return;
      }
      
      setLoading(true);
      try {
          const instruction = rewriteInstruction || "Improve flow and professionalism.";
          const isHtmlSelection = viewMode === 'visual' && selectionHtml.trim().length > 0 && /<[^>]+>/.test(selectionHtml);
          const rewritten = isHtmlSelection
              ? await rewriteHtmlFragment(selectionHtml, instruction)
              : await rewriteArticleText(selection, instruction);

          const applyReplaceOrThrow = (before: string, after: string, fallback: () => string) => {
              if (before === after) return fallback();
              return after;
          };

          let nextContent = editorContent;
          if (viewMode === 'source' && selectionRange) {
              const currentSlice = editorContent.substring(selectionRange.start, selectionRange.end);
              if (currentSlice === selection) {
                  nextContent = editorContent.slice(0, selectionRange.start) + rewritten + editorContent.slice(selectionRange.end);
              } else {
                  const replaced = editorContent.replace(selection, rewritten);
                  nextContent = applyReplaceOrThrow(editorContent, replaced, () => {
                      throw new Error('Selection no longer matches the source. Re-select the text and try again.');
                  });
              }
          } else if (isHtmlSelection) {
              const replaced = editorContent.replace(selectionHtml, rewritten);
              nextContent = applyReplaceOrThrow(editorContent, replaced, () => {
                  const fallback = editorContent.replace(selection, rewritten);
                  if (fallback === editorContent) throw new Error('Selection match failed. Switch to Source mode for precise rewrites.');
                  return fallback;
              });
          } else {
              const replaced = editorContent.replace(selection, rewritten);
              nextContent = applyReplaceOrThrow(editorContent, replaced, () => {
                  throw new Error('Selection match failed. Switch to Source mode for precise rewrites.');
              });
          }

          setEditorContent(nextContent);
          setSelection('');
          setSelectionRange(null);
          setSelectionHtml('');
          setRewriteInstruction('');
      } catch (e: any) {
          showModal('error', 'Rewrite Failed', e.message);
      } finally {
          setLoading(false);
      }
  };

  const handleFullRewrite = async () => {
      showModal('confirm', 'Rewrite Article', 'Rewrite the ENTIRE article? This will replace current content.', async () => {
          setLoading(true);
          try {
              const maxChars = 60000;
              const currentHtml = String(editorContent || '').trim();
              if (!currentHtml) throw new Error('Article is empty.');
              const trimmedHtml = currentHtml.length > maxChars
                  ? `${currentHtml.slice(0, maxChars)}\n<!-- [TRUNCATED_FOR_REWRITE] -->`
                  : currentHtml;

              const rewritten = await rewriteFullArticleHtml(trimmedHtml, rewriteInstruction || undefined);
              const cleaned = String(rewritten || '').trim();
              if (!cleaned) throw new Error('AI returned empty content.');
              if (!/<h1\b|<h2\b|<p\b/i.test(cleaned)) throw new Error('AI returned invalid content (not HTML).');
              setEditorContent(cleaned);
          } catch (e: any) {
              showModal('error', 'Rewrite Failed', e.message);
          } finally {
              setLoading(false);
          }
      });
  };

  // --- IMAGE SLOT LOGIC ---
  const handleInsertImageSlot = () => {
      const slotId = `img-slot-${Date.now()}`;
      const slotHtml = `<div class="technova-img-slot" id="${slotId}" data-status="empty">
          <div class="slot-content">
              <span>🖼️ IMAGE GENERATION ZONE</span>
              <button class="generate-btn" onclick="window.dispatchEvent(new CustomEvent('technova-gen-img', { detail: '${slotId}' }))">GENERATE HERE</button>
          </div>
      </div>`;
      
      // Attempt to insert at cursor position if selection exists, else append
      if (selection) {
          const newContent = editorContent.replace(selection, selection + "\n" + slotHtml);
          setEditorContent(newContent);
      } else {
          setEditorContent(prev => prev + "\n" + slotHtml);
      }
      
      // Scroll to bottom/cursor logic handled by react re-render
      setTimeout(() => {
          if (visualRef.current) visualRef.current.scrollTop = visualRef.current.scrollHeight;
      }, 100);
  };

  // Listen for clicks on the "Generate Here" buttons inside the HTML preview
  useEffect(() => {
      const handleGenEvent = (e: any) => {
          const slotId = e.detail;
          setActiveImgSlotId(slotId);
          setProductName('');
          setEnvironment('');
          setGeneratedImage(null);
          setGeneratedImageSource('ai');
          setPexelsQuery('');
          setPexelsResults([]);
          setShowImgModal(true);
      };
      window.addEventListener('technova-gen-img', handleGenEvent);
      return () => window.removeEventListener('technova-gen-img', handleGenEvent);
  }, []);

  const handleGenerateImage = async () => {
      if (!productName || !environment) {
          showModal('error', 'Missing Input', 'Please provide both Product Name and Environment.');
          return;
      }
      
      setGenLoading(true);
      setGeneratedImage(null);
      setGeneratedImageSource('ai');
      
      try {
          const result = await visualizeProduct(productName, environment);
          const localMatch = String(result || '').match(/\/(data\/out\/[^\s'"`]+\.(?:png|jpe?g|webp))/i);
          if (localMatch && localMatch[0]) {
              const localUrl = new URL(localMatch[0], window.location.origin).toString();
              setGeneratedImage(localUrl);
              setGeneratedImageSource('url');
              return;
          }
          // Check for data:image prefix or URL
          if (result.includes('http') || result.startsWith('data:image')) {
              setGeneratedImage(result);
              setGeneratedImageSource(result.startsWith('data:image') ? 'ai' : 'url');
          } else {
              // Fallback: Sometimes model returns Markdown image syntax
              const match = result.match(/\((.*?)\)/);
              if (match && match[1].startsWith('http')) {
                  setGeneratedImage(match[1]);
                  setGeneratedImageSource('url');
              } else {
                  console.warn("Raw Image Gen Result:", result);
                  showModal('info', 'Generation Result', 'The model returned text instead of an image. Ensure the server is configured with an image-capable model.');
              }
          }
      } catch (e: any) {
          showModal('error', 'Generation Error', e.message);
      } finally {
          setGenLoading(false);
      }
  };

  const handleSearchPexels = async () => {
      const query = (pexelsQuery || productName).trim();
      if (!query) {
          showModal('error', 'Missing Input', 'Provide a search query (e.g. product name).');
          return;
      }
      setPexelsLoading(true);
      try {
          const res = await fetch(`/api/pexels/search?query=${encodeURIComponent(query)}&perPage=18&orientation=landscape`, {
              method: 'GET',
              headers: getHeaders()
          });
          if (!res.ok) throw new Error((await res.json()).error || 'Pexels search failed');
          const data = await res.json();
          setPexelsResults(Array.isArray(data.photos) ? data.photos : []);
      } catch (e: any) {
          showModal('error', 'Pexels Error', e.message || 'Pexels search failed');
      } finally {
          setPexelsLoading(false);
      }
  };

  const handleSaveImageToSlot = async () => {
      if (!generatedImage || !activeImgSlotId) return;
      
      setGenLoading(true);
      try {
          const timestamp = Date.now();
          const safeName = productName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result || ''));
              reader.onerror = () => reject(new Error('Failed to read image'));
              reader.readAsDataURL(blob);
          });

          let ext = 'png';
          let base64Payload = '';

          if (generatedImage.startsWith('data:image')) {
              const match = generatedImage.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.*)$/);
              if (!match) throw new Error('Invalid data:image payload');
              ext = match[1].toLowerCase().includes('jpeg') ? 'jpg' : match[1].toLowerCase();
              base64Payload = match[2];
          } else if (generatedImageSource === 'pexels') {
              const r = await fetch('/api/pexels/download', {
                  method: 'POST',
                  headers: getHeaders(),
                  body: JSON.stringify({ url: generatedImage })
              });
              const data = await r.json();
              if (!r.ok) throw new Error(data?.error || 'Pexels download failed');
              ext = String(data?.ext || 'jpg').toLowerCase();
              base64Payload = String(data?.base64 || '');
              if (!base64Payload) throw new Error('Empty image payload');
          } else {
              const r = await fetch(generatedImage);
              if (!r.ok) throw new Error(`Image fetch failed (${r.status})`);
              const blob = await r.blob();
              const dataUrl = await blobToDataUrl(blob);
              const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.*)$/);
              if (!match) throw new Error('Unsupported image payload');
              ext = match[1].toLowerCase().includes('jpeg') ? 'jpg' : match[1].toLowerCase();
              base64Payload = match[2];
          }

          const filename = `img_${safeName}_${timestamp}.${ext}`;
          const localPath = `/tmp/images/${filename}`;
          
          await db.writeVFS(localPath, base64Payload); 
          await ftpService.upload(localPath, `${IMAGES_ROOT}/${filename}`);
          
          const imgTag = `<img src="images/articles/${filename}" alt="${productName}" class="technova-featured-img" />`;
          
          const regex = new RegExp(`<div[^>]*id="${activeImgSlotId}"[^>]*>[\\s\\S]*?<\\/div>`, 'g');
          const newContent = editorContent.replace(regex, imgTag);
          
          setEditorContent(newContent);
          setShowImgModal(false);
          setActiveImgSlotId(null);
          showModal('success', 'Image Injected', 'Image saved to FTP and inserted into article.');
          
      } catch (e: any) {
          showModal('error', 'Save Failed', e.message);
      } finally {
          setGenLoading(false);
      }
  };

  // --- SELECTION HANDLING ---
  const handleTextSelect = () => {
      if (viewMode === 'source' && textareaRef.current) {
          const start = textareaRef.current.selectionStart;
          const end = textareaRef.current.selectionEnd;
          if (start !== end) {
              setSelection(editorContent.substring(start, end));
              setSelectionRange({ start, end });
              setSelectionHtml('');
          } else {
              setSelection('');
              setSelectionRange(null);
              setSelectionHtml('');
          }
      }
  };

  const handleWysiwygSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
      if (viewMode !== 'visual') return;
      const el = e.currentTarget;
      const start = Number.isFinite(Number(el.selectionStart)) ? Number(el.selectionStart) : 0;
      const end = Number.isFinite(Number(el.selectionEnd)) ? Number(el.selectionEnd) : 0;
      if (start !== end) {
          const value = String(el.value || '');
          setSelection(value.substring(start, end));
          setSelectionRange(null);
          setSelectionHtml('');
      } else {
          setSelection('');
          setSelectionRange(null);
          setSelectionHtml('');
      }
  };

  const handleVisualSelect = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && sel.toString().length > 0) {
          setSelection(sel.toString());
          setSelectionRange(null);
          try {
              const range = sel.getRangeAt(0).cloneRange();
              const frag = range.cloneContents();
              const container = document.createElement('div');
              container.appendChild(frag);
              setSelectionHtml(container.innerHTML || '');
          } catch {
              setSelectionHtml('');
          }
      } else {
          setSelection('');
          setSelectionRange(null);
          setSelectionHtml('');
      }
  };

  const getInlineEl = (id: string | null) => {
      if (!id) return null;
      return inlineRefs.current.get(id) || null;
  };

  const syncActiveInlineFromDom = () => {
      const el = getInlineEl(activeInlineBlockId);
      if (!el) return;
      const html = sanitizeInlineHtml(el.innerHTML || '');
      const idx = (editorBlocks || []).findIndex(b => b.id === activeInlineBlockId);
      if (idx === -1) return;
      patchBlock(idx, { html });
  };

  const execInline = (command: string, value?: string) => {
      const el = getInlineEl(activeInlineBlockId);
      if (!el) return;
      el.focus();
      try {
          document.execCommand(command, false, value);
      } catch {
      }
      setTimeout(() => syncActiveInlineFromDom(), 0);
  };

  // --- CONTENT PROCESSING FOR PREVIEW ---
  const processContentForPreview = (html: string) => {
      if (!html) return '';
      return html.replace(/src="([^"]+)"/g, (match, src) => {
          if (src.startsWith('http') || src.startsWith('data:')) {
              return match;
          }
          return `src="${PUBLIC_IMG_BASE}${src}"`;
      });
  };

  const handleOpenLocalPreview = () => {
    window.open(`${window.location.protocol}//${window.location.hostname}:8080/api/blog-preview`, '_blank');
  };

  const toDateMs = (dateStr: string) => {
      const t = Date.parse(String(dateStr || '').trim());
      return Number.isFinite(t) ? t : 0;
  };

  const toModifiedMs = (raw: string) => {
      const t = Date.parse(String(raw || '').trim());
      return Number.isFinite(t) ? t : 0;
  };

  const isVisibleFile = (name: string) => visibleArticles.includes(name);

  const sortedArticles = [...articles].sort((a: any, b: any) => {
      const an = String(a?.name || '');
      const bn = String(b?.name || '');
      const av = isVisibleFile(an);
      const bv = isVisibleFile(bn);
      if (av !== bv) return av ? -1 : 1;

      const ad = toDateMs(articleInfo[an]?.date || '');
      const bd = toDateMs(articleInfo[bn]?.date || '');
      if (ad !== bd) return bd - ad;

      const am = toModifiedMs(String(a?.rawModifiedAt || ''));
      const bm = toModifiedMs(String(b?.rawModifiedAt || ''));
      if (am !== bm) return bm - am;

      return an.localeCompare(bn);
  });

  const ContentBlock = ({ 
       id,
       html, 
       tagName, 
       className, 
       onUpdate, 
       onFocus, 
       onSelect, 
       disabled 
   }: {
       id: string;
       html: string;
       tagName: string;
       className: string;
       onUpdate: (html: string) => void;
       onFocus?: (e: any) => void;
       onSelect?: (e: any) => void;
       disabled?: boolean;
   }) => {
       const elRef = useRef<HTMLElement>(null);
       const lastHtmlRef = useRef(html);
 
       // Register in inlineRefs for formatting toolbar
       useEffect(() => {
           if (elRef.current && id) {
               inlineRefs.current.set(id, elRef.current as HTMLDivElement);
           }
           return () => {
               if (id) inlineRefs.current.delete(id);
           }
       }, [id]);

       // Sync from props only if not focused to avoid cursor jumping/conflict
       useEffect(() => {
           if (elRef.current && html !== elRef.current.innerHTML) {
               if (document.activeElement !== elRef.current) {
                   elRef.current.innerHTML = html;
                   lastHtmlRef.current = html;
               }
           }
       }, [html]);

      const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
          const currentHtml = sanitizeInlineHtml(e.currentTarget.innerHTML);
          if (currentHtml !== lastHtmlRef.current) {
              lastHtmlRef.current = currentHtml;
              onUpdate(currentHtml);
          }
      };

      return React.createElement(tagName, {
          ref: elRef,
          className,
          contentEditable: !disabled,
          suppressContentEditableWarning: true,
          dangerouslySetInnerHTML: { __html: html },
          onBlur: handleBlur,
          onFocus,
          onInput: (e: any) => {
              // Just update local ref, don't trigger parent re-render
              lastHtmlRef.current = e.currentTarget.innerHTML;
          },
          onMouseUp: onSelect,
          onKeyUp: onSelect,
          onClick: (e: any) => {
             // Ensure focus doesn't get lost weirdly
             e.stopPropagation();
          }
      });
  };

  return (
    <div className="flex flex-col h-full bg-neu-base text-neu-text font-mono">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neu-dark/20 bg-neu-base/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-neu-pressed rounded-lg shadow-neu-pressed">
             <FileText size={20} className="text-blue-400" />
          </div>
          <h2 className="text-lg font-bold tracking-tight">Blog Command Center</h2>
        </div>
        
        <div className="flex gap-2">
           <button 
             onClick={handleOpenLocalPreview}
             className="px-4 py-2 bg-neu-base rounded-lg shadow-neu-flat hover:text-blue-400 flex items-center gap-2 text-sm font-bold transition-all active:shadow-neu-pressed"
           >
             <Eye size={16} />
             Preview Local
           </button>
           <button 
             onClick={handleNewArticle}
             className="px-4 py-2 bg-neu-base rounded-lg shadow-neu-flat hover:text-green-400 flex items-center gap-2 text-sm font-bold transition-all active:shadow-neu-pressed"
           >
             <Plus size={16} />
             New Article
           </button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-hidden flex flex-col">
        
        {/* LIST VIEW */}
        {activeTab === 'list' && (
            <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-neu-text">Technova Articles (FTP)</h2>
                    <div className="flex gap-3">
                        <button onClick={fetchArticles} className="p-2 rounded-xl bg-neu-base shadow-neu-flat hover:text-blue-400 transition-all">
                            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                        </button>
                        <button
                            onClick={() => handleAutoFixImages()}
                            disabled={maintenanceLoading}
                            className="px-4 py-2 rounded-xl bg-neu-base shadow-neu-flat hover:text-purple-400 font-bold text-sm flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                            {maintenanceLoading ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
                            Auto-fix All Images
                        </button>
                        <button onClick={handleNewArticle} className="px-4 py-2 rounded-xl bg-neu-base shadow-neu-flat hover:text-green-400 font-bold text-sm flex items-center gap-2 transition-all">
                            <Plus size={18} /> New Article
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                    {loading && articles.length === 0 && (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-400" size={32} /></div>
                    )}
                    {!loading && articles.length === 0 && (
                        <div className="text-center text-neu-muted py-10 opacity-50">Folder is empty. Create a new article.</div>
                    )}
                    {sortedArticles.map((file, idx) => (
                        <div 
                            key={idx} 
                            onClick={() => handleOpenArticle(file.name)}
                            className="flex justify-between items-center p-4 bg-neu-base shadow-neu-flat rounded-xl hover:border-blue-500/30 border border-transparent transition-all group cursor-pointer"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-lg bg-neu-dark/30 text-blue-400">
                                    <MonitorPlay size={24} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex flex-col">
                                            <div className="font-bold text-sm text-neu-text group-hover:text-blue-400 transition-colors leading-tight">
                                                {articleInfo[file.name]?.title || getSlugFromFileName(file.name)}
                                            </div>
                                            <div className="text-[10px] text-neu-muted">{file.name}</div>
                                        </div>
                                        {visibleArticles.includes(file.name) ? (
                                            <span className="text-[9px] font-bold bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded border border-green-500/20 uppercase tracking-wide">Visible</span>
                                        ) : (
                                            <span className="text-[9px] font-bold bg-neu-dark text-neu-muted px-1.5 py-0.5 rounded border border-neu-border uppercase tracking-wide">Hidden</span>
                                        )}
                                    </div>
                                    <div className="text-[10px] text-neu-muted">
                                        {file.size} bytes • {articleInfo[file.name]?.date || file.rawModifiedAt}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleAutoFixImages(file.name); }}
                                    disabled={maintenanceFileLoading === file.name}
                                    className="p-2 hover:text-purple-400 transition-colors disabled:opacity-50"
                                    title="Fix images in this article"
                                >
                                    {maintenanceFileLoading === file.name ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
                                </button>
                                <button 
                                    onClick={(e) => handleToggleVisibility(e, file.name)} 
                                    className={`p-2 transition-colors ${visibleArticles.includes(file.name) ? 'text-green-400 hover:text-green-300' : 'text-neu-muted hover:text-neu-text'}`}
                                    title={visibleArticles.includes(file.name) ? "Visible on Blog" : "Hidden from Blog"}
                                >
                                    {visibleArticles.includes(file.name) ? <Eye size={18} /> : <EyeOff size={18} />}
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteArticle(file.name); }} 
                                    className="p-2 hover:text-red-400 transition-colors" title="Delete"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* EDITOR VIEW */}
        {activeTab === 'editor' && (
            <div className="flex flex-col h-full gap-4">
                {!currentFile ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-neu-muted gap-4">
                        <Edit3 size={48} className="opacity-20" />
                        <p>No article loaded.</p>
                        <button onClick={() => setActiveTab('list')} className="text-blue-400 hover:underline">Go to List</button>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-center bg-neu-base shadow-neu-flat p-4 rounded-xl shrink-0">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setActiveTab('list')} className="p-2 hover:bg-neu-light/10 rounded-lg"><ArrowLeft size={18}/></button>
                                <div>
                                    <div className="text-xs text-neu-muted uppercase tracking-wider">Editing</div>
                                    <div className="font-bold text-sm text-blue-400">{currentFile.name}</div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                {/* VIEW TOGGLE */}
                                <div className="flex bg-neu-dark/30 p-1 rounded-lg border border-neu-light/10">
                                    <button 
                                        onClick={() => setViewMode('visual')}
                                        className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'visual' ? 'bg-neu-base shadow-sm text-blue-400' : 'text-neu-muted hover:text-neu-text'}`}
                                    >
                                        <Eye size={14} /> WYSIWYG
                                    </button>
                                    <button 
                                        onClick={() => setViewMode('source')}
                                        className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-all ${viewMode === 'source' ? 'bg-neu-base shadow-sm text-purple-400' : 'text-neu-muted hover:text-neu-text'}`}
                                    >
                                        <Code size={14} /> HTML
                                    </button>
                                </div>

                                <button onClick={handleInsertImageSlot} className="px-4 py-2 bg-neu-base shadow-neu-flat hover:shadow-neu-pressed text-purple-400 font-bold text-xs rounded-xl flex items-center gap-2 transition-all border border-transparent hover:border-purple-500/30">
                                    <ImageIcon size={16} /> Add Img Slot
                                </button>

                                <button onClick={handleSaveArticle} className="px-6 py-2 bg-neu-base shadow-neu-pressed text-green-400 font-bold rounded-xl flex items-center gap-2 hover:bg-neu-light/5 transition-all text-xs">
                                    {loading ? <Loader2 className="animate-spin" size={16}/> : <Save size={16} />} Save
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 flex gap-4 overflow-hidden">
                            {/* Editor Area */}
                            <div className="flex-1 flex flex-col gap-2 relative bg-neu-dark/10 rounded-xl border border-neu-border overflow-hidden">
                                {viewMode === 'source' ? (
                                    <textarea 
                                        ref={textareaRef}
                                        className="flex-1 w-full h-full bg-neu-dark/20 p-6 outline-none text-neu-text font-mono text-sm resize-none custom-scrollbar leading-relaxed"
                                        value={editorContent}
                                        onChange={(e) => setEditorContent(e.target.value)}
                                        onSelect={handleTextSelect}
                                        spellCheck={false}
                                        disabled={loading}
                                    />
                                ) : (
                                    <div 
                                        ref={visualRef}
                                        className="flex-1 w-full h-full p-6 overflow-y-auto custom-scrollbar bg-white/5 text-neu-text/90 technova-preview"
                                    >
                                        {/* WYSIWYG + Preview Styles */}
                                        <style>{`
                                            .technova-preview { font-family: 'Inter', system-ui, sans-serif; line-height: 1.6; color: #ffffff; background: #121212; }
                                            .technova-preview h1 { font-size: 2.25rem; font-weight: 800; margin-bottom: 1.5rem; color: #ffffff; letter-spacing: -0.025em; line-height: 1.1; }
                                            .technova-preview h2 { font-size: 1.75rem; font-weight: 700; margin-top: 2.5rem; margin-bottom: 1rem; color: #ffffff; border-bottom: 2px solid #00bfff; padding-bottom: 0.5rem; letter-spacing: 0.05em; }
                                            .technova-preview h3 { font-size: 1.4rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; color: #00bfff; }
                                            .technova-preview p { margin-bottom: 1.5rem; font-size: 1.125rem; line-height: 1.8; color: #ffffff; }
                                            .technova-preview ul, .technova-preview ol { padding-left: 1.5rem; margin-bottom: 1.5rem; color: #ffffff; }
                                            .technova-preview li { margin-bottom: 0.5rem; padding-left: 0.5rem; }
                                            .technova-preview li::marker { color: #00bfff; font-weight: bold; }
                                            .technova-preview img { display: block; max-width: 100%; height: auto; border-radius: 25px; margin: 2.5rem 0; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
                                            .technova-preview strong { color: #ffffff; font-weight: 700; }
                                            .technova-preview em { color: #cccccc; font-style: italic; }
                                            .technova-preview a { color: #00bfff; text-decoration: none; transition: color 0.15s ease; }
                                            .technova-preview a:hover { color: #33ccff; }
                                            .technova-preview blockquote { border-left: 4px solid #00bfff; padding: 1rem 1.5rem; margin: 2rem 0; background: rgba(0, 191, 255, 0.05); border-radius: 0 12px 12px 0; font-style: italic; color: #cccccc; font-size: 1.1rem; }
                                            
                                            /* Editor UI Overrides */
                                            .technova-block-card { border: 1px solid rgba(68, 68, 68, 0.3); background: rgba(42, 42, 42, 0.4); border-radius: 16px; backdrop-filter: blur(10px); margin-bottom: 1rem; }
                                            .technova-block-input { width: 100%; background: transparent; border: none; padding: 0; color: inherit; outline: none; font-family: inherit; font-size: inherit; resize: none; }
                                            .technova-block-input:focus { outline: none; }
                                            
                                            /* Slot Styles */
                                            .technova-img-slot { 
                                                border: 2px dashed #00bfff; 
                                                background: rgba(0, 191, 255, 0.05); 
                                                border-radius: 12px; 
                                                padding: 40px; 
                                                margin: 2.5rem 0; 
                                                display: flex; 
                                                justify-content: center; 
                                                align-items: center; 
                                                transition: all 0.2s;
                                            }
                                            .technova-img-slot:hover { background: rgba(0, 191, 255, 0.1); border-color: #33ccff; }
                                            .slot-content { display: flex; flex-direction: column; align-items: center; gap: 15px; }
                                            .slot-content span { font-weight: 800; color: #00bfff; font-size: 0.75rem; letter-spacing: 0.2em; text-transform: uppercase; }
                                            .generate-btn { 
                                                background: linear-gradient(135deg, #00bfff, #4A90E2); 
                                                color: white; 
                                                border: none; 
                                                padding: 10px 20px; 
                                                border-radius: 8px; 
                                                font-weight: bold; 
                                                cursor: pointer; 
                                                font-size: 0.9rem; 
                                                box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
                                                transition: transform 0.1s, background 0.2s;
                                            }
                                            .generate-btn:hover { background: linear-gradient(135deg, #ff6600, #FF8C42); transform: translateY(-2px); }
                                        `}</style>
                                        <div className="max-w-3xl mx-auto space-y-4">
                                            <div className="sticky top-0 z-10 -mx-2 px-2 py-2 bg-black/20 backdrop-blur rounded-2xl border border-white/10 flex flex-wrap gap-2 items-center">
                                                <button onClick={() => addBlock('p')} className="px-3 py-1.5 rounded-xl bg-neu-base/60 border border-white/10 text-xs font-bold hover:bg-neu-base transition-colors">+ Akapit</button>
                                                <button onClick={() => addBlock('h2')} className="px-3 py-1.5 rounded-xl bg-neu-base/60 border border-white/10 text-xs font-bold hover:bg-neu-base transition-colors">+ H2</button>
                                                <button onClick={() => addBlock('blockquote')} className="px-3 py-1.5 rounded-xl bg-neu-base/60 border border-white/10 text-xs font-bold hover:bg-neu-base transition-colors">+ Cytat</button>
                                                <button onClick={() => addBlock('ul')} className="px-3 py-1.5 rounded-xl bg-neu-base/60 border border-white/10 text-xs font-bold hover:bg-neu-base transition-colors">+ Lista</button>
                                                <button onClick={() => addBlock('img')} className="px-3 py-1.5 rounded-xl bg-neu-base/60 border border-white/10 text-xs font-bold hover:bg-neu-base transition-colors">+ Obraz</button>
                                                <button onClick={() => addBlock('imgSlot')} className="px-3 py-1.5 rounded-xl bg-neu-base/60 border border-white/10 text-xs font-bold hover:bg-neu-base transition-colors">+ Slot AI</button>

                                                <div className="ml-auto flex items-center gap-2">
                                                    <button
                                                        onClick={() => execInline('bold')}
                                                        className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-colors"
                                                        title="Bold"
                                                    >
                                                        B
                                                    </button>
                                                    <button
                                                        onClick={() => execInline('italic')}
                                                        className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-colors"
                                                        title="Italic"
                                                    >
                                                        I
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            showModal('prompt', 'Link', 'Wklej URL', (url?: string) => {
                                                                const raw = String(url || '').trim();
                                                                if (!raw) return;
                                                                const normalized = /^(https?:\/\/|mailto:|tel:|#|\/)/i.test(raw) ? raw : `https://${raw}`;
                                                                execInline('createLink', normalized);
                                                            });
                                                        }}
                                                        className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-colors"
                                                        title="Link"
                                                    >
                                                        Link
                                                    </button>
                                                    <button
                                                        onClick={() => execInline('unlink')}
                                                        className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-colors"
                                                        title="Unlink"
                                                    >
                                                        Unlink
                                                    </button>
                                                    <button
                                                        onClick={() => execInline('removeFormat')}
                                                        className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-colors"
                                                        title="Clear formatting"
                                                    >
                                                        Clear
                                                    </button>
                                                </div>
                                            </div>

                                            {(editorBlocks || []).length === 0 && (
                                                <div className="text-sm text-neu-muted opacity-70 p-6 technova-block-card">Pusty artykuł. Dodaj pierwszy blok powyżej.</div>
                                            )}

                                            {(editorBlocks || []).map((b, idx) => (
                                                <div
                                                    key={b.id}
                                                    className={`technova-block-card p-4 transition-shadow ${dragFromIndex !== null && dragOverIndex === idx && dragFromIndex !== idx ? 'ring-2 ring-blue-500/40 shadow-[0_0_0_1px_rgba(59,130,246,0.35)]' : ''}`}
                                                    onDragOver={(e) => {
                                                        if (dragFromIndex === null) return;
                                                        e.preventDefault();
                                                        setDragOverIndex(idx);
                                                    }}
                                                    onDragLeave={() => {
                                                        if (dragFromIndex === null) return;
                                                        setDragOverIndex(null);
                                                    }}
                                                    onDrop={(e) => {
                                                        if (dragFromIndex === null) return;
                                                        e.preventDefault();
                                                        const raw = e.dataTransfer.getData('text/plain');
                                                        const parsed = Number(raw);
                                                        const from = Number.isFinite(parsed) ? parsed : dragFromIndex;
                                                        moveBlockTo(from, idx);
                                                        setDragFromIndex(null);
                                                        setDragOverIndex(null);
                                                    }}
                                                >
                                                    <div className="flex items-center justify-between gap-3 mb-3">
                                                        <div className="text-[10px] uppercase tracking-widest font-black text-neu-muted">
                                                            {b.type}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                draggable
                                                                onDragStart={(e) => {
                                                                    setDragFromIndex(idx);
                                                                    setDragOverIndex(idx);
                                                                    try {
                                                                        e.dataTransfer.effectAllowed = 'move';
                                                                        e.dataTransfer.setData('text/plain', String(idx));
                                                                    } catch {}
                                                                }}
                                                                onDragEnd={() => {
                                                                    setDragFromIndex(null);
                                                                    setDragOverIndex(null);
                                                                }}
                                                                className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 cursor-grab active:cursor-grabbing"
                                                                title="Drag to move"
                                                            >
                                                                <GripVertical size={14} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleGenImageFromBlock(b, idx)}
                                                                className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 transition-colors" 
                                                                title="Generate Image from this context"
                                                            >
                                                                <Wand2 size={14} />
                                                            </button>
                                                            <button onClick={() => moveBlock(idx, -1)} className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10" title="Move up"><ChevronUp size={14} /></button>
                                                            <button onClick={() => moveBlock(idx, 1)} className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10" title="Move down"><ChevronDown size={14} /></button>
                                                            <button onClick={() => deleteBlock(idx)} className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20" title="Delete"><Trash2 size={14} /></button>
                                                        </div>
                                                    </div>

                                                    {(b.type === 'h1' || b.type === 'h2' || b.type === 'h3') && (
                                                        <textarea
                                                            className="technova-block-input"
                                                            value={b.text || ''}
                                                            onChange={(e) => patchBlock(idx, { text: e.target.value })}
                                                            onSelect={(e) => handleWysiwygSelect(e as any)}
                                                            rows={2}
                                                            disabled={loading}
                                                        />
                                                    )}

                                                    {(b.type === 'p' || b.type === 'blockquote') && (
                                                        <ContentBlock
                                                            id={b.id}
                                                            tagName={b.type === 'blockquote' ? 'blockquote' : 'p'}
                                                            className="technova-block-input min-h-[40px] whitespace-pre-wrap break-words outline-none"
                                                            html={String(b.html || '') || escapeHtmlText(String(b.text || ''))}
                                                            onUpdate={(html) => patchBlock(idx, { html })}
                                                            onFocus={() => setActiveInlineBlockId(b.id)}
                                                            onSelect={handleVisualSelect}
                                                            disabled={loading}
                                                        />
                                                    )}

                                                    {(b.type === 'ul' || b.type === 'ol') && (
                                                        <textarea
                                                            className="technova-block-input font-mono text-[12px]"
                                                            value={(b.items || []).join('\n')}
                                                            onChange={(e) => patchBlock(idx, { items: e.target.value.split(/\r?\n/).map(x => x.trim()).filter(x => x.length > 0) })}
                                                            rows={Math.max(3, (b.items || []).length + 1)}
                                                            disabled={loading}
                                                        />
                                                    )}

                                                    {b.type === 'img' && (
                                                        <div className="space-y-3">
                                                            <input
                                                                className="technova-block-input font-mono text-[12px]"
                                                                value={b.src || ''}
                                                                onChange={(e) => patchBlock(idx, { src: e.target.value })}
                                                                placeholder="src (np. images/articles/xxx.jpg lub https://...)"
                                                                disabled={loading}
                                                            />
                                                            <input
                                                                className="technova-block-input font-mono text-[12px]"
                                                                value={b.alt || ''}
                                                                onChange={(e) => patchBlock(idx, { alt: e.target.value })}
                                                                placeholder="alt"
                                                                disabled={loading}
                                                            />
                                                            {b.src && (
                                                                <div className="rounded-xl overflow-hidden border border-white/10">
                                                                    <img
                                                                        src={(String(b.src || '').startsWith('http') || String(b.src || '').startsWith('data:')) ? String(b.src || '') : `${PUBLIC_IMG_BASE}${String(b.src || '')}`}
                                                                        alt={b.alt || ''}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {(b.type === 'imgSlot' || b.type === 'html') && (
                                                        <div className="rounded-xl border border-white/10 bg-black/20 p-3 overflow-x-auto">
                                                            <div dangerouslySetInnerHTML={{ __html: processContentForPreview(String(b.html || '')) }} />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {loading && (
                                    <div className="absolute inset-0 bg-neu-base/50 backdrop-blur-sm flex items-center justify-center z-10">
                                        <div className="bg-neu-base p-4 rounded-xl shadow-neu-flat flex items-center gap-3">
                                            <Loader2 className="animate-spin text-blue-400" />
                                            <span>Processing AI Request...</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* AI Toolbar */}
                            <div className="w-64 flex flex-col gap-4 bg-neu-base shadow-neu-pressed p-4 rounded-xl shrink-0 border border-neu-border">
                                <h3 className="text-xs font-bold text-neu-muted uppercase tracking-widest flex items-center gap-2">
                                    <Wand2 size={14} /> AI Assistant
                                </h3>
                                
                                <div className="space-y-3 mb-2">
                                    <button 
                                        onClick={handleInsertImageSlot} 
                                        className="w-full py-3 bg-neu-base shadow-neu-flat active:shadow-neu-pressed text-purple-400 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 border border-transparent hover:border-purple-500/30"
                                    >
                                        <ImageIcon size={14} /> Insert Image Gen Slot
                                    </button>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] text-neu-muted font-bold">REWRITE INSTRUCTIONS</label>
                                    <textarea 
                                        className="w-full h-24 bg-neu-base shadow-inner rounded-lg p-2 text-xs text-neu-text outline-none resize-none border border-transparent focus:border-blue-500/20"
                                        placeholder="e.g. Make it punchier, focus on pros/cons, check grammar..."
                                        value={rewriteInstruction}
                                        onChange={(e) => setRewriteInstruction(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2 mt-2">
                                    <button 
                                        onClick={handleRewriteSelection}
                                        disabled={!selection || loading}
                                        className="w-full py-3 bg-neu-base shadow-neu-flat active:shadow-neu-pressed text-blue-400 text-xs font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                    >
                                        {loading ? <Loader2 className="animate-spin" size={14} /> : <Edit3 size={14} />} Rewrite Selection
                                    </button>
                                    
                                    <button 
                                        onClick={handleFullRewrite}
                                        disabled={loading}
                                        className="w-full py-3 bg-neu-base shadow-neu-flat active:shadow-neu-pressed text-purple-400 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                                    >
                                        {loading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />} Rewrite Article
                                    </button>
                                </div>

                                {selection && (
                                    <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                        <div className="text-[9px] text-blue-300 font-bold mb-1">SELECTED TEXT</div>
                                        <div className="text-[10px] text-neu-text line-clamp-3 italic opacity-70">"{selection}"</div>
                                    </div>
                                )}
                                
                                {!selection && viewMode === 'visual' && (
                                    <div className="mt-2 text-[10px] text-neu-muted italic text-center">
                                        Tip: Highlight text in the preview to enable rewriting.
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        )}
      </div>

      {/* GENERATION MODAL OVERLAY */}
      {showImgModal && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in duration-200">
              <div className="w-full max-w-4xl bg-neu-base rounded-2xl shadow-2xl border border-neu-border flex overflow-hidden max-h-[80vh]">
                  
                  {/* Left: Controls */}
                  <div className="w-1/3 p-6 border-r border-neu-border flex flex-col gap-6 overflow-y-auto">
                      <div className="flex justify-between items-center">
                          <h3 className="font-bold text-lg text-neu-text flex items-center gap-2"><ImageIcon className="text-purple-400"/> Image</h3>
                          <button onClick={() => setShowImgModal(false)} className="p-1 hover:text-red-400 text-neu-muted"><X size={20}/></button>
                      </div>
                      
                      <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-neu-muted uppercase tracking-wider mb-2 ml-1">Subject / Product</label>
                                <input 
                                    className="w-full bg-neu-base shadow-neu-pressed rounded-xl p-3 text-sm text-neu-text outline-none focus:border-purple-500/30 border border-transparent"
                                    placeholder="e.g. iPhone 16 Pro Max"
                                    value={productName}
                                    onChange={(e) => setProductName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-neu-muted uppercase tracking-wider mb-2 ml-1">Environment / Style</label>
                                <textarea 
                                    className="w-full bg-neu-base shadow-neu-pressed rounded-xl p-3 text-sm text-neu-text outline-none focus:border-purple-500/30 border border-transparent resize-none h-24"
                                    placeholder="e.g. Cyberpunk city, neon lights, 4k realistic"
                                    value={environment}
                                    onChange={(e) => setEnvironment(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-neu-muted uppercase tracking-wider mb-2 ml-1">Pexels Search</label>
                                <input
                                    className="w-full bg-neu-base shadow-neu-pressed rounded-xl p-3 text-sm text-neu-text outline-none focus:border-blue-500/30 border border-transparent"
                                    placeholder="e.g. wireless earbuds product photo"
                                    value={pexelsQuery}
                                    onChange={(e) => setPexelsQuery(e.target.value)}
                                />
                            </div>
                            <button 
                                onClick={handleGenerateImage}
                                disabled={genLoading}
                                className="w-full py-4 bg-neu-base shadow-neu-flat active:shadow-neu-pressed text-purple-400 font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:text-purple-300"
                            >
                                {genLoading ? <Loader2 className="animate-spin"/> : <Wand2 />}
                                {genLoading ? 'Visualizing...' : 'Generate (AI)'}
                            </button>
                            <button
                                onClick={handleSearchPexels}
                                disabled={pexelsLoading}
                                className="w-full py-4 bg-neu-base shadow-neu-flat active:shadow-neu-pressed text-blue-400 font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:text-blue-300"
                            >
                                {pexelsLoading ? <Loader2 className="animate-spin"/> : <Search />}
                                {pexelsLoading ? 'Searching...' : 'Search Pexels'}
                            </button>
                      </div>
                  </div>

                  {/* Right: Preview */}
                  <div className="flex-1 bg-black/20 flex flex-col items-center justify-center p-6 relative">
                        {genLoading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/40 z-10">
                                <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                                <span className="text-purple-300 font-bold animate-pulse">Rendering...</span>
                            </div>
                        )}
                        
                        {generatedImage ? (
                            <div className="flex flex-col items-center gap-6 w-full h-full">
                                <img src={generatedImage} alt="Generated" className="max-w-full max-h-[70%] object-contain rounded-lg shadow-2xl border border-white/10" />
                                <button 
                                    onClick={handleSaveImageToSlot}
                                    className="px-8 py-3 bg-green-500 text-white font-bold rounded-xl shadow-lg hover:bg-green-400 transition-all flex items-center gap-2"
                                >
                                    <CheckSquare size={18}/> Save & Insert
                                </button>
                            </div>
                        ) : pexelsResults.length > 0 ? (
                            <div className="w-full h-full overflow-y-auto">
                                <div className="grid grid-cols-3 gap-3">
                                    {pexelsResults.map((p: any) => {
                                        const thumb = p?.src?.tiny || p?.src?.small || p?.src?.medium;
                                        const full = p?.src?.large2x || p?.src?.large || p?.src?.medium;
                                        if (!thumb || !full) return null;
                                        return (
                                            <button
                                                key={String(p?.id || full)}
                                                onClick={() => {
                                                    setGeneratedImage(full);
                                                    setGeneratedImageSource('pexels');
                                                }}
                                                className="rounded-lg overflow-hidden border border-white/10 hover:border-blue-500/40 transition-colors bg-black/20"
                                                title={String(p?.alt || p?.photographer || 'Pexels')}
                                            >
                                                <img src={thumb} alt={String(p?.alt || 'Pexels')} className="w-full h-28 object-cover" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center opacity-30 flex flex-col items-center gap-4">
                                <ImageIcon size={64} />
                                <span className="text-lg font-bold">Preview Area</span>
                            </div>
                        )}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};
