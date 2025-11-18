import { useState, useEffect } from "react";
import { FileText, Upload, Eye, Globe, Clock, Tag, Search, Filter, Plus, Edit, Trash2 } from "lucide-react";

export default function PublicationsManager() {
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newPublication, setNewPublication] = useState({
    title: "",
    content: "",
    tags: [],
    slug: ""
  });

  useEffect(() => {
    fetchPublications();
  }, []);

  const fetchPublications = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/publications");
      const data = await response.json();
      setPublications(data.publications || []);
    } catch (error) {
      console.error("Błąd pobierania publikacji:", error);
      setPublications([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!newPublication.title || !newPublication.content) {
      alert("Tytuł i treść są wymagane");
      return;
    }

    try {
      const response = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newPublication.title,
          content: newPublication.content,
          tags: newPublication.tags,
          slug: newPublication.slug || generateSlug(newPublication.title)
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert("Publikacja zakończona sukcesem!");
        setShowNewForm(false);
        setNewPublication({ title: "", content: "", tags: [], slug: "" });
        fetchPublications();
      } else {
        throw new Error("Błąd publikacji");
      }
    } catch (error) {
      console.error("Błąd publikacji:", error);
      alert("Wystąpił błąd podczas publikacji");
    }
  };

  const handlePreview = (content) => {
    setPreviewContent(content);
    setShowPreview(true);
  };

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const filteredPublications = publications.filter(pub => {
    const matchesSearch = pub.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pub.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || pub.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status) => {
    const colors = {
      published: "bg-green-100 text-green-800",
      draft: "bg-gray-100 text-gray-800",
      scheduled: "bg-blue-100 text-blue-800",
      failed: "bg-red-100 text-red-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neo-fg">Publications Manager</h2>
          <p className="text-neo-muted">Manage and publish content with AI optimization</p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="neo-btn neo-btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>New Publication</span>
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neo-muted" />
          <input
            type="text"
            placeholder="Search publications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="neo-input w-full pl-10"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="neo-input px-3 py-2"
        >
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* New Publication Form */}
      {showNewForm && (
        <div className="neo-card p-6">
          <h3 className="text-lg font-semibold text-neo-fg mb-4">Create New Publication</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neo-muted mb-1">Title</label>
              <input
                type="text"
                value={newPublication.title}
                onChange={(e) => setNewPublication({...newPublication, title: e.target.value})}
                className="neo-input w-full"
                placeholder="Enter publication title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neo-muted mb-1">Slug (optional)</label>
              <input
                type="text"
                value={newPublication.slug}
                onChange={(e) => setNewPublication({...newPublication, slug: e.target.value})}
                className="neo-input w-full"
                placeholder="will be auto-generated from title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neo-muted mb-1">Content</label>
              <textarea
                value={newPublication.content}
                onChange={(e) => setNewPublication({...newPublication, content: e.target.value})}
                className="neo-input w-full h-32"
                placeholder="Write your content here..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neo-muted mb-1">Tags (comma-separated)</label>
              <input
                type="text"
                value={newPublication.tags.join(", ")}
                onChange={(e) => setNewPublication({...newPublication, tags: e.target.value.split(",").map(tag => tag.trim()).filter(tag => tag)})}
                className="neo-input w-full"
                placeholder="tag1, tag2, tag3"
              />
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handlePublish}
                className="neo-btn neo-btn-primary flex items-center space-x-2"
              >
                <Upload className="h-4 w-4" />
                <span>Publish</span>
              </button>
              <button
                onClick={() => handlePreview(newPublication.content)}
                className="neo-btn flex items-center space-x-2"
              >
                <Eye className="h-4 w-4" />
                <span>Preview</span>
              </button>
              <button
                onClick={() => setShowNewForm(false)}
                className="neo-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publications List */}
      <div className="neo-card">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "var(--accent)" }}></div>
          </div>
        ) : (
          <div>
            {filteredPublications.map((publication) => (
              <div key={publication.id} className="p-6 neo-surface">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <FileText className="h-6 w-6 text-neo-muted mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-neo-fg truncate">
                          {publication.title}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(publication.status)}`}>
                          {publication.status}
                        </span>
                      </div>
                      <p className="text-neo-muted mb-3 line-clamp-2">
                        {publication.content.substring(0, 200)}...
                      </p>
                      <div className="flex items-center space-x-6 text-sm text-neo-muted">
                        <div className="flex items-center space-x-1">
                          <Globe className="h-4 w-4" />
                          <span>{publication.slug}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{new Date(publication.created_at).toLocaleDateString()}</span>
                        </div>
                        {publication.tags.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <Tag className="h-4 w-4" />
                            <div className="flex space-x-1">
                              {publication.tags.slice(0, 3).map((tag, index) => (
                                <span key={index} className="px-2 py-1 bg-[#1f2937] text-neo-fg rounded text-xs">
                                  {tag}
                                </span>
                              ))}
                              {publication.tags.length > 3 && (
                                <span className="text-xs text-neo-muted">+{publication.tags.length - 3}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePreview(publication.content)}
                      className="neo-btn flex items-center space-x-1 text-sm"
                    >
                      <Eye className="h-3 w-3" />
                      <span>Preview</span>
                    </button>
                    <button
                      onClick={() => {/* TODO: Edit functionality */}}
                      className="neo-btn flex items-center space-x-1 text-sm"
                    >
                      <Edit className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => {/* TODO: Delete functionality */}}
                      className="neo-btn neo-btn-danger flex items-center space-x-1 text-sm"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filteredPublications.length === 0 && (
              <div className="p-8 text-center text-neo-muted">
                <FileText className="h-12 w-12 mx-auto mb-4 text-neo-muted" />
                <p>No publications found</p>
                <p className="text-sm mt-1">
                  {searchTerm || filterStatus !== "all" 
                    ? "Try adjusting your search or filter" 
                    : "Create your first publication to get started"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="neo-card max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="p-6 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neo-fg">Content Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="neo-btn"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh] text-neo-fg">
              <div className="prose max-w-none">
                <div dangerouslySetInnerHTML={{__html: previewContent.replace(/\n/g, '<br />')}} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
