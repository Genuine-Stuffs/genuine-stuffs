import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "backend/supabaseClient";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { BlogPost as BlogPostType } from "@/components/blog/BlogCard";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Calendar, User, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) return;
      
      try {
        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .eq("slug", slug)
          .single();

        if (error) {
          console.error("Error fetching post:", error);
        } else {
          setPost(data as BlogPostType);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-grow flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-4xl font-black mb-4">Post Not Found</h1>
          <p className="text-muted-foreground mb-8">The article you're looking for doesn't exist or has been removed.</p>
          <Link to="/blog" className="text-primary hover:underline font-bold flex items-center">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Blog
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-grow pt-24 pb-20">
        <article className="container max-w-4xl mx-auto px-4">
          
          <Link to="/blog" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-primary mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to all posts
          </Link>

          <header className="mb-10 text-center md:text-left">
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-6 leading-tight">
              {post.title}
            </h1>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-slate-500 font-medium">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                <User className="w-4 h-4 mr-2 text-primary" />
                <span>{post.author}</span>
              </div>
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                <Calendar className="w-4 h-4 mr-2 text-primary" />
                <span>{format(new Date(post.created_at), "MMMM d, yyyy")}</span>
              </div>
            </div>
          </header>

          {post.image_url && (
            <div className="w-full h-64 md:h-[400px] mb-12 rounded-3xl overflow-hidden shadow-lg border border-slate-100 dark:border-slate-800 relative">
              <img 
                src={post.image_url} 
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-black prose-a:text-primary prose-img:rounded-xl">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {post.content}
            </ReactMarkdown>
          </div>
          
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default BlogPost;
