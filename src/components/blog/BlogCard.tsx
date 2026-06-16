import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Calendar, User } from "lucide-react";

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  author: string;
  image_url: string | null;
  published: boolean;
  created_at: string;
}

interface BlogCardProps {
  post: BlogPost;
}

export const BlogCard = ({ post }: BlogCardProps) => {
  // Extract a brief snippet from the content (assuming markdown)
  const snippet = post.content.replace(/[#_*\[\]]/g, "").substring(0, 150) + "...";

  return (
    <Link 
      to={`/blog/${post.slug}`}
      className="group flex flex-col bg-white rounded-xl overflow-hidden border border-gray-200 hover:shadow-lg transition-all duration-300"
    >
      <div className="relative h-48 w-full bg-gray-100 overflow-hidden">
        {post.image_url ? (
          <img 
            src={post.image_url} 
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-200">
            <span className="text-4xl font-bold opacity-50">GS</span>
          </div>
        )}
      </div>
      
      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {post.title}
        </h3>
        
        <p className="text-gray-600 text-sm mb-4 line-clamp-3 flex-grow">
          {snippet}
        </p>
        
        <div className="flex items-center text-xs text-gray-500 mt-auto pt-4 border-t border-gray-100">
          <div className="flex items-center mr-4">
            <User className="w-4 h-4 mr-1" />
            <span>{post.author}</span>
          </div>
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-1" />
            <span>{format(new Date(post.created_at), "MMM d, yyyy")}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};
