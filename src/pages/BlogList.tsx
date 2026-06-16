import { useState, useEffect } from "react";
import { supabase } from "backend/supabaseClient";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { BlogCard, BlogPost } from "@/components/blog/BlogCard";

const BlogList = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .eq("published", true)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching posts:", error);
        } else {
          setPosts(data as BlogPost[] || []);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4 uppercase tracking-tight">
              Genuine Stuffs <span className="text-primary italic">Blog</span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Insights, updates, and expert advice on building materials, AI in construction, and project management in Africa.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <p className="text-xl">No blog posts found.</p>
              <p className="mt-2">Check back soon for new content!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BlogList;
