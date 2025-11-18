'use client';
import { useState, useEffect } from "react";
import { FileText, Upload, Eye, Globe, Clock, Tag, Search, Filter, Plus, Edit, Trash2, X, Loader2 } from "lucide-react";

const PublicationCard = ({ publication, onPreview, onEdit, onDelete, getStatusVariant }) => (
    <div className="neo-surface p-4 rounded-lg transition-shadow hover:shadow-lg">
        <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-md font-semibold text-neo-fg truncate" title={publication.title}>
                        {publication.title}
                    </h3>
                    <span className={`neo-badge ${getStatusVariant(publication.status)}`}>
                        {publication.status}
                    </span>
                </div>
                <p className="text-sm text-neo-muted mb-3 line-clamp-2">{publication.content}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-neo-muted">
                    <div className="flex items-center gap-1.5" title="Slug">
                        <Globe className="w-3.5 h-3.5" />
                        <span>{publication.slug}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="Creation Date">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(publication.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
                {publication.tags && publication.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {publication.tags.map(tag => (
                            <span key={tag} className="neo-badge neo-badge-info text-xs">{tag}</span>
                        ))}
                    </div>
                )}
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <button onClick={() => onPreview(publication.content)} className="neo-btn-sm" title="Preview">
                        <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => onEdit(publication)} className="neo-btn-sm" title="Edit">
                        <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(publication.id)} className="neo-btn-sm neo-btn-danger" title="Delete">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    </div>
);

const PublicationForm = ({ publication, onSave, onCancel, isSaving }) => {
    const [formData, setFormData] = useState(publication || {
        title: "",
        content: "",
        tags: [],
        slug: ""
    });

    const generateSlug = (title) => {
        return title
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
            .replace(/--+/g, '-')
            .replace(/^-+|-+$/g, "");
    };

    const handleTitleChange = (e) => {
        const newTitle = e.target.value;
        setFormData(prev => ({
            ...prev,
            title: newTitle,
            slug: generateSlug(newTitle)
        }));
    };

    const handleTagsChange = (e) => {
        const tags = e.target.value.split(",").map(tag => tag.trim()).filter(Boolean);
        setFormData(prev => ({ ...prev, tags }));
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="neo-card w-full max-w-2xl max-h-[90vh] flex flex-col">
                <header className="flex items-center justify-between p-4 border-b border-neo-surface">
                    <h3 className="text-lg font-bold text-neo-fg">{publication ? "Edit" : "New"} Publication</h3>
                    <button onClick={onCancel} className="neo-btn-sm neo-btn-danger">
                        <X className="w-4 h-4" />
                    </button>
                </header>
                <main className="p-6 space-y-4 overflow-y-auto">
                    <input
                        type="text"
                        placeholder="Publication Title"
                        value={formData.title}
                        onChange={handleTitleChange}
                        className="neo-input w-full text-lg"
                    />
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-neo-muted">Slug:</span>
                        <input
                            type="text"
                            placeholder="auto-generated-slug"
                            value={formData.slug}
                            onChange={e => setFormData({ ...formData, slug: e.target.value })}
                            className="neo-input w-full text-sm"
                        />
                    </div>
                    <textarea
                        placeholder="Write your publication content here... Supports Markdown."
                        value={formData.content}
                        onChange={e => setFormData({ ...formData, content: e.target.value })}
                        className="neo-input w-full h-48 resize-y text-sm"
                    />
                    <input
                        type="text"
                        placeholder="Tags (comma-separated, e.g., tech, ai, update)"
                        defaultValue={formData.tags.join(", ")}
                        onChange={handleTagsChange}
                        className="neo-input w-full text-sm"
                    />
                </main>
                <footer className="p-4 flex justify-end gap-3 border-t border-neo-surface">
                    <button onClick={onCancel} className="neo-btn">Cancel</button>
                    <button onClick={() => onSave(formData)} className="neo-btn neo-btn-primary" disabled={isSaving}>
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        <span>{isSaving ? "Saving..." : "Save Publication"}</span>
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default function PublicationsManager() {
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [editingPublication, setEditingPublication] = useState(null); // null for new, or publication object for editing
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPublications();
  }, []);

  const fetchPublications = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/publications");
      if (!response.ok) throw new Error("Failed to fetch publications");
      const data = await response.json();
      setPublications(data.publications || []);
    } catch (error) {
      console.error("Error fetching publications:", error);
      setPublications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePublication = async (publicationData) => {
    setIsSaving(true);
    const isEditing = !!publicationData.id;
    const url = isEditing ? `/api/publications/${publicationData.id}` : "/api/publications";
    const method = isEditing ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(publicationData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${isEditing ? 'update' : 'create'} publication`);
      }

      await fetchPublications();
      setEditingPublication(null);
    } catch (error) {
      console.error("Save publication error:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
      if (!window.confirm("Are you sure you want to delete this publication?")) return;

      try {
          const response = await fetch(`/api/publications/${id}`, { method: "DELETE" });
          if (!response.ok) throw new Error("Failed to delete publication");
          await fetchPublications();
      } catch (error) {
          console.error("Delete error:", error);
          alert("Failed to delete publication.");
      }
  };

  const handlePreview = (content) => {
    setPreviewContent(content);
    setShowPreview(true);
  };

  const filteredPublications = publications.filter(pub => {
    const matchesSearch = pub.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (pub.content && pub.content.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterStatus === "all" || pub.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusVariant = (status) => {
    const variants = {
      published: "neo-badge-success",
      draft: "neo-badge-warning",
      scheduled: "neo-badge-info",
      failed: "neo-badge-danger"
    };
    return variants[status] || "neo-badge-warning";
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neo-surface">
        <div>
            <h1 className="text-3xl font-bold text-neo-fg flex items-center gap-3">
                <FileText className="w-8 h-8 text-purple-500" />
                Publications Manager
            </h1>
            <p className="text-neo-muted mt-1">Create, manage, and publish content.</p>
        </div>
        <button
          onClick={() => setEditingPublication({ title: "", content: "", tags: [], slug: "" })}
          className="neo-btn neo-btn-primary"
        >
          <Plus className="h-5 w-5" />
          <span>New Publication</span>
        </button>
      </header>

      {/* Search and Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-2 neo-surface rounded-lg">
        <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neo-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search by title or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="neo-input w-full pl-9"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="neo-input appearance-none pr-8"
        >
          <option value="all">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Form Modal */}
      {editingPublication && (
          <PublicationForm 
            publication={editingPublication}
            onSave={handleSavePublication}
            onCancel={() => setEditingPublication(null)}
            isSaving={isSaving}
          />
      )}

      {/* Publications List */}
      <div className="neo-card p-2 sm:p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
            <p className="text-neo-muted">Loading publications...</p>
          </div>
        ) : (
          <>
            {filteredPublications.length > 0 ? (
                <div className="space-y-3">
                    {filteredPublications.map((publication) => (
                        <PublicationCard
                            key={publication.id}
                            publication={publication}
                            onPreview={handlePreview}
                            onEdit={setEditingPublication}
                            onDelete={handleDelete}
                            getStatusVariant={getStatusVariant}
                        />
                    ))}
                </div>
            ) : (
              <div className="text-center py-20">
                <FileText className="h-16 w-16 mx-auto mb-4 text-neo-muted" />
                <h3 className="text-xl font-semibold text-neo-fg">No Publications Found</h3>
                <p className="text-neo-muted mt-2">
                  {searchTerm || filterStatus !== "all" 
                    ? "No publications match your criteria."
                    : "Click \"New Publication\" to create your first one."}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="neo-card w-full max-w-3xl max-h-[90vh] flex flex-col">
            <header className="flex items-center justify-between p-4 border-b border-neo-surface">
              <h3 className="text-lg font-bold text-neo-fg">Content Preview</h3>
              <button onClick={() => setShowPreview(false)} className="neo-btn-sm neo-btn-danger">
                <X className="w-4 h-4" />
              </button>
            </header>
            <main className="p-6 overflow-y-auto text-neo-fg prose prose-invert prose-sm max-w-none">
              <div dangerouslySetInnerHTML={{__html: previewContent.replace(/\n/g, '<br />')}} />
            </main>
          </div>
        </div>
      )}
    </div>
  );
}
