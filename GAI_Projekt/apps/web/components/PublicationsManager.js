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
          <h2 className="text-2xl font-bold text-gray-900">Publications Manager</h2>
          <p className="text-gray-600">Manage and publish content with AI optimization</p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Publication</span>
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search publications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Publication</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={newPublication.title}
                onChange={(e) => setNewPublication({...newPublication, title: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter publication title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug (optional)</label>
              <input
                type="text"
                value={newPublication.slug}
                onChange={(e) => setNewPublication({...newPublication, slug: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="will be auto-generated from title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                value={newPublication.content}
                onChange={(e) => setNewPublication({...newPublication, content: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
                placeholder="Write your content here..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
              <input
                type="text"
                value={newPublication.tags.join(", ")}
                onChange={(e) => setNewPublication({...newPublication, tags: e.target.value.split(",").map(tag => tag.trim()).filter(tag => tag)})}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="tag1, tag2, tag3"
              />
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handlePublish}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload className="h-4 w-4" />
                <span>Publish</span>
              </button>
              <button
                onClick={() => handlePreview(newPublication.content)}
                className="flex items-center space-x-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Eye className="h-4 w-4" />
                <span>Preview</span>
              </button>
              <button
                onClick={() => setShowNewForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publications List */}
      <div className="bg-white rounded-lg border">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredPublications.map((publication) => (
              <div key={publication.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <FileText className="h-6 w-6 text-gray-400 mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {publication.title}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(publication.status)}`}>
                          {publication.status}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-3 line-clamp-2">
                        {publication.content.substring(0, 200)}...
                      </p>
                      <div className="flex items-center space-x-6 text-sm text-gray-500">
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
                                <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                  {tag}
                                </span>
                              ))}
                              {publication.tags.length > 3 && (
                                <span className="text-xs text-gray-500">+{publication.tags.length - 3}</span>
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
                      className="flex items-center space-x-1 px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Eye className="h-3 w-3" />
                      <span>Preview</span>
                    </button>
                    <button
                      onClick={() => {/* TODO: Edit functionality */}}
                      className="flex items-center space-x-1 px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Edit className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => {/* TODO: Delete functionality */}}
                      className="flex items-center space-x-1 px-3 py-1 text-sm border rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filteredPublications.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Content Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
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