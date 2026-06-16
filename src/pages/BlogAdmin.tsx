import { useState, useEffect } from "react";
import { supabase } from "backend/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { BlogPost } from "@/components/blog/BlogCard";
import { toast } from "sonner";
import { FileEdit, Plus, Trash2, Link as LinkIcon, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function BlogAdmin() {
  const { role } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [author, setAuthor] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [content, setContent] = useState("");
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load posts");
    } else {
      setPosts(data as BlogPost[] || []);
    }
    setLoading(false);
  };

  const handleEdit = (post: BlogPost) => {
    setIsEditing(true);
    setCurrentId(post.id);
    setTitle(post.title);
    setSlug(post.slug);
    setAuthor(post.author);
    setImageUrl(post.image_url || "");
    setContent(post.content);
    setPublished(post.published);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setIsEditing(false);
    setCurrentId(null);
    setTitle("");
    setSlug("");
    setAuthor("");
    setImageUrl("");
    setContent("");
    setPublished(false);
  };

  const autoGenerateSlug = (titleText: string) => {
    if (!isEditing && !slug) {
      setSlug(titleText.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !slug || !author || !content) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSaving(true);
    const postData = {
      title,
      slug,
      author,
      image_url: imageUrl || null,
      content,
      published,
    };

    try {
      if (isEditing && currentId) {
        const { error } = await supabase.from("posts").update(postData).eq("id", currentId);
        if (error) throw error;
        toast.success("Post updated successfully!");
      } else {
        const { error } = await supabase.from("posts").insert([postData]);
        if (error) throw error;
        toast.success("Post created successfully!");
      }
      handleReset();
      fetchPosts();
    } catch (error: any) {
      toast.error(error.message || "Failed to save post");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    
    try {
      const { error } = await supabase.from("posts").delete().eq("id", id);
      if (error) throw error;
      toast.success("Post deleted.");
      fetchPosts();
      if (currentId === id) handleReset();
    } catch (error: any) {
      toast.error("Failed to delete post");
    }
  };

  if (role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-grow flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-4xl font-black mb-4 text-red-500">Access Denied</h1>
          <p className="text-muted-foreground mb-8">You must be an administrator to view this page.</p>
          <Button asChild>
            <Link to="/">Return to Home</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-grow pt-24 pb-20">
        <div className="container max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Form Section */}
          <div className="lg:col-span-7 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-2xl font-black text-slate-800">
                {isEditing ? "Edit Post" : "Create New Post"}
              </h2>
              {isEditing && (
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <Plus className="w-4 h-4 mr-2" /> New Post
                </Button>
              )}
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">Title *</label>
                  <input 
                    type="text" 
                    value={title} 
                    onChange={(e) => {
                      setTitle(e.target.value);
                      autoGenerateSlug(e.target.value);
                    }}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="Enter post title"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">Slug (URL) *</label>
                  <input 
                    type="text" 
                    value={slug} 
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="my-post-url"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">Author *</label>
                  <input 
                    type="text" 
                    value={author} 
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">Image URL</label>
                  <input 
                    type="url" 
                    value={imageUrl} 
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700 flex justify-between">
                  <span>Content (Markdown) *</span>
                  <a href="https://www.markdownguide.org/cheat-sheet/" target="_blank" rel="noreferrer" className="text-primary text-xs hover:underline flex items-center">
                    <LinkIcon className="w-3 h-3 mr-1" /> Markdown Guide
                  </a>
                </label>
                <textarea 
                  value={content} 
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono text-sm min-h-[300px]"
                  placeholder="## Heading&#10;&#10;Write your post here..."
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <label className="flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={published}
                    onChange={(e) => setPublished(e.target.checked)}
                    className="w-5 h-5 text-primary bg-slate-100 border-slate-300 rounded focus:ring-primary focus:ring-2"
                  />
                  <span className="ml-2 text-sm font-bold text-slate-700">Publish Post (Visible to public)</span>
                </label>

                <Button type="submit" disabled={saving} className="px-8 font-bold">
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isEditing ? "Update Post" : "Save Post"}
                </Button>
              </div>
            </form>
          </div>

          {/* Posts List Section */}
          <div className="lg:col-span-5 flex flex-col h-full max-h-[800px]">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex-grow flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
                <h2 className="text-xl font-black text-slate-800">All Posts</h2>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{posts.length} Total</span>
              </div>
              
              <div className="overflow-y-auto flex-grow pr-2 space-y-3">
                {loading ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : posts.length === 0 ? (
                  <p className="text-center text-slate-500 text-sm py-10">No posts yet.</p>
                ) : (
                  posts.map((post) => (
                    <div key={post.id} className={`p-4 rounded-xl border ${currentId === post.id ? 'border-primary bg-primary/5' : 'border-slate-100 bg-slate-50'} hover:border-primary/30 transition-colors`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-slate-800 line-clamp-1">{post.title}</h3>
                          <div className="flex items-center gap-2 mt-1 text-xs font-medium">
                            <span className={post.published ? "text-green-600" : "text-amber-500"}>
                              {post.published ? "Published" : "Draft"}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-500">{new Date(post.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button variant="ghost" size="icon" className="w-8 h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => handleEdit(post)}>
                            <FileEdit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="w-8 h-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(post.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
