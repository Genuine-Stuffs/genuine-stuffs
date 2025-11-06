import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FileText, Video, Download, BookOpen, AlertTriangle, TrendingUp } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Resources = () => {
  const articles = [
    {
      icon: AlertTriangle,
      category: "Case Study",
      title: "10 Material Failures Common in Tropical Climates",
      description: "Learn from real-world examples of how climate-specific material failures impact construction projects in tropical regions.",
      readTime: "8 min read",
    },
    {
      icon: TrendingUp,
      category: "Analysis",
      title: "How to Compare Material Lifespans",
      description: "A practical guide to evaluating and comparing the long-term performance and cost-effectiveness of different building materials.",
      readTime: "6 min read",
    },
    {
      icon: BookOpen,
      category: "Guide",
      title: "Impact of Structural Materials on Asset Resale Value",
      description: "Discover how material quality directly affects property valuations and investment returns over time.",
      readTime: "10 min read",
    },
    {
      icon: FileText,
      category: "Report",
      title: "Steel vs. Concrete: A Lifecycle Cost Analysis",
      description: "Comprehensive comparison of two primary structural materials including durability, maintenance, and long-term value.",
      readTime: "12 min read",
    },
    {
      icon: AlertTriangle,
      category: "Best Practices",
      title: "Quality Control Protocols for Construction Materials",
      description: "Essential quality control measures to ensure material compliance and performance on construction sites.",
      readTime: "7 min read",
    },
    {
      icon: BookOpen,
      category: "Technical",
      title: "Understanding Material Certifications and Standards",
      description: "Navigate ISO, ASTM, and local building code requirements for construction materials with confidence.",
      readTime: "9 min read",
    },
  ];

  const downloads = [
    {
      title: "Material Quality Checklist for Project Owners",
      description: "A comprehensive PDF checklist covering essential material quality considerations for construction projects.",
      icon: Download,
      format: "PDF",
    },
    {
      title: "Lifecycle Cost Curve: Quality vs Cheap Materials",
      description: "Infographic showing the true cost comparison of quality materials versus cheap alternatives over 20+ years.",
      icon: Download,
      format: "Infographic",
    },
    {
      title: "Material Compliance Quick Reference Guide",
      description: "Essential reference document for building codes, standards, and certification requirements.",
      icon: Download,
      format: "PDF",
    },
  ];

  const videos = [
    {
      title: "Introduction to Material Lifecycle Planning",
      duration: "15:30",
      description: "Learn the fundamentals of planning for material performance throughout a building's lifespan.",
    },
    {
      title: "Case Study: Preventing Premature Material Failure",
      duration: "12:45",
      description: "Real-world example of how proper material selection prevented costly structural issues.",
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Resources & Insights
            </h1>
            <p className="text-xl text-muted-foreground">
              Expert knowledge to help you make informed decisions about construction materials, quality, and lifecycle performance.
            </p>
          </div>
        </div>
      </section>

      {/* Articles Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Educational Articles</h2>
            <p className="text-xl text-muted-foreground">
              In-depth guides and analyses on material quality, durability, and best practices.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article, index) => (
              <Card key={index} className="border-2 hover:border-primary transition-all hover:shadow-lg cursor-pointer">
                <CardContent className="pt-6">
                  <article.icon className="w-10 h-10 text-primary mb-4" />
                  <div className="text-sm text-primary font-medium mb-2">{article.category}</div>
                  <h3 className="text-xl font-semibold mb-3">{article.title}</h3>
                  <p className="text-muted-foreground mb-4">{article.description}</p>
                  <div className="text-sm text-muted-foreground">{article.readTime}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Downloadable Resources */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Downloadable Resources</h2>
            <p className="text-xl text-muted-foreground">
              Free tools and guides to support your material quality decisions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {downloads.map((download, index) => (
              <Card key={index} className="border-2 hover:border-primary transition-colors">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <download.icon className="w-12 h-12 text-primary" />
                    <span className="text-xs font-medium px-3 py-1 bg-primary/10 text-primary rounded-full">
                      {download.format}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{download.title}</h3>
                  <p className="text-muted-foreground mb-6">{download.description}</p>
                  <Button asChild className="w-full">
                    <Link to="/contact">
                      <Download className="w-4 h-4 mr-2" />
                      Download Free
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Video Resources */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Video Library</h2>
            <p className="text-xl text-muted-foreground">
              Visual guides and case studies from our expert consultants.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {videos.map((video, index) => (
              <Card key={index} className="border-2 hover:border-primary transition-colors">
                <CardContent className="pt-6">
                  <div className="aspect-video bg-secondary/50 rounded-lg mb-4 flex items-center justify-center">
                    <Video className="w-16 h-16 text-muted-foreground" />
                  </div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-semibold">{video.title}</h3>
                    <span className="text-sm text-muted-foreground">{video.duration}</span>
                  </div>
                  <p className="text-muted-foreground">{video.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Stay Updated on Material Quality Insights
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Subscribe to our newsletter for regular updates on construction materials, quality standards, and industry best practices.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <input
                type="email"
                placeholder="Enter your email"
                className="px-6 py-3 rounded-lg text-foreground flex-1 max-w-md"
              />
              <Button size="lg" variant="secondary">
                Subscribe
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Resources;
