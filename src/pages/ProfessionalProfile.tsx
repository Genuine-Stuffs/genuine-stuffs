import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "backend/supabaseClient";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
    ShieldCheck, 
    MapPin, 
    Link as LinkIcon, 
    Users, 
    UserPlus, 
    MessageCircle,
    Plus,
    Pencil,
    Camera,
    ArrowLeft,
    Search,
    Settings as SettingsIcon,
    MoreHorizontal,
    CheckCircle2,
    LogOut,
    Clock,
    ShoppingBag,
    Mail,
    Phone
} from "lucide-react";
import ExperienceCard from "@/components/pro/ExperienceCard";
import AddExperienceDialog from "@/components/pro/AddExperienceDialog";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useRef } from "react";
import EditIntroDialog from "@/components/pro/EditIntroDialog";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ProfessionalProfile = () => {
    const { id } = useParams();
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<any>(null);
    const [experiences, setExperiences] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddExpOpen, setIsAddExpOpen] = useState(false);
    const [isEditIntroOpen, setIsEditIntroOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const isOwnProfile = user?.id === id;
    const [showContactInfo, setShowContactInfo] = useState(false);
    const { role } = useAuth();

    const handlePhotoClick = (type: 'avatar' | 'cover') => {
        if (type === 'avatar') fileInputRef.current?.click();
        else coverInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, field: 'avatar_url' | 'cover_url') => {
        const file = event.target.files?.[0];
        if (!file || !user) return;
        
        const toastId = "photo-upload";
        try {
            toast.loading(`Uploading ${field === 'avatar_url' ? 'profile' : 'cover'} photo...`, { id: toastId });
            
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}-${field}.${fileExt}`;
            const filePath = `profiles/${fileName}`;
            
            // Try Standard buckets: avatars, then profiles, then fallback to materials
            const buckets = ['avatars', 'profiles', 'materials'];
            let uploadError: any = null;
            let successBucket = '';

            for (const bucket of buckets) {
                const { error } = await supabase.storage
                    .from(bucket)
                    .upload(filePath, file, { upsert: true });
                
                if (!error) {
                    successBucket = bucket;
                    break;
                }
                uploadError = error;
            }

            if (!successBucket) throw new Error("Storage bucket not found. Please create a bucket named 'avatars' in Supabase.");

            // Manually construct public URL to ensure /public/ segment is included correctly
            const projectUrl = import.meta.env.VITE_SUPABASE_URL;
            const publicUrl = `${projectUrl}/storage/v1/object/public/${successBucket}/${filePath}`;


            const { error: updateError } = await supabase
                .from('professionals')
                .update({ [field]: publicUrl })
                .eq('id', user.id);

            if (updateError) throw updateError;

            toast.success("Photo updated successfully!", { id: toastId });
            fetchProfileData();
        } catch (err: any) {
            console.error("Error uploading photo:", err);
            toast.error(err.message || "Failed to upload photo.", { id: toastId });
        }
    };

    const fetchProfileData = async () => {
        const profileId = id?.trim();
        if (!profileId || profileId === 'undefined') {
            console.error("Malformed or missing ID:", profileId);
            setIsLoading(false);
            return;
        }
        try {
            // Fetch basic profile info (using maybeSingle to prevent 406/PGRST116 errors on empty results)
            const { data: profData, error: profError } = await supabase
                .from('professionals')
                .select('*')
                .eq('id', profileId)
                .maybeSingle();

            if (profError) {
                console.error("DEBUG - Professionals Fetch Error:", profError);
                // Log full details for 400 errors
                if (profError.code === '22P02') console.error("ID format mismatch - expected UUID.");
                throw profError;
            }
            
            if (!profData && isOwnProfile && user) {
                // Self-healing: Auto-create the user's profile row if it somehow got deleted or missed during signup
                const newProfile = {
                    id: user.id,
                    full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || "Professional",
                    specialty: "Expert Professional",
                    credits: 10,
                };
                const { error: insertError } = await supabase.from('professionals').upsert(newProfile);
                if (insertError) {
                    console.error("DEBUG - Profile Creation Error:", insertError);
                }
                setProfile(newProfile);
            } else {
                setProfile(profData);
            }

            // Fetch experiences
            const { data: expData, error: expError } = await (supabase
                .from('professional_experiences' as any))
                .select('*')
                .eq('professional_id', profileId)
                .order('start_date', { ascending: false });

            if (expError) throw expError;
            setExperiences(expData || []);

        } catch (err) {
            console.error("Error fetching profile:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setIsLoading(true);
        fetchProfileData();
    }, [id, user]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
                <Navbar />
                <div className="container mx-auto px-4 py-8 space-y-6">
                    <Skeleton className="h-[300px] w-full rounded-[2rem]" />
                    <Skeleton className="h-[200px] w-full rounded-[2rem]" />
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center">
                <Navbar />
                <h2 className="text-xl font-black uppercase tracking-tighter">Profile Not Found</h2>
                <Button className="mt-4" asChild><Link to="/pros">Back to Experts</Link></Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 selection:bg-primary/30 pb-20">
            <Navbar />

            
            <main className="container mx-auto px-0 md:px-4 pt-0 md:pt-10 max-w-5xl space-y-6">
                
                {/* Header Card (LinkedIn Style Optimization) */}
                <Card className="overflow-hidden border-none shadow-xl rounded-none md:rounded-[2.5rem] bg-white dark:bg-card relative">
                    {/* Cover Photo */}
                    <div className="h-32 md:h-56 bg-slate-200 dark:bg-white/5 relative overflow-hidden group">
                        {profile.cover_url ? (
                            <img 
                                src={profile.cover_url} 
                                className="w-full h-full object-cover" 
                                alt="cover" 
                                onError={(e) => {
                                    console.error("Cover image failed to load:", profile.cover_url);
                                    (e.target as HTMLImageElement).src = ""; // Fallback to gradient
                                }}
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900" />
                        )}
                        {isOwnProfile && (
                            <>
                                <input 
                                    type="file" 
                                    ref={coverInputRef} 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={(e) => handleFileChange(e, 'cover_url')}
                                />
                                <button 
                                    onClick={() => handlePhotoClick('cover')}
                                    className="absolute bottom-4 right-4 p-2.5 bg-slate-950/80 text-white rounded-full shadow-2xl transition-all duration-300 hover:bg-primary border border-white/20 group/cam backdrop-blur-sm"
                                >
                                    <Camera className="w-5 h-5 md:w-6 md:h-6 group-hover/cam:scale-110 transition-transform" />
                                </button>
                            </>
                        )}
                    </div>

                    <CardContent className="px-5 md:px-10 pb-8 relative">
                        {/* Avatar Overlay */}
                        <div className="relative -mt-12 md:-mt-24 mb-4 inline-block group">
                            <div className="w-24 h-24 md:w-40 md:h-40 rounded-full border-4 md:border-[6px] border-white dark:border-card overflow-hidden bg-white shadow-2xl relative">
                                <img 
                                    src={profile.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.full_name}`} 
                                    alt={profile.full_name} 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        console.error("Avatar failed to load:", profile.avatar_url);
                                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${profile.full_name}`;
                                    }}
                                />
                                {isOwnProfile && (
                                    <>
                                        <input 
                                            type="file" 
                                            ref={fileInputRef} 
                                            className="hidden" 
                                            accept="image/*"
                                            onChange={(e) => handleFileChange(e, 'avatar_url')}
                                        />
                                        <button 
                                            onClick={() => handlePhotoClick('avatar')}
                                            className="absolute bottom-1 right-1 p-2 bg-slate-950/80 text-white rounded-full shadow-2xl transition-all duration-300 hover:bg-primary border border-white/10 z-30 backdrop-blur-sm"
                                        >
                                            <Camera className="w-4 h-4 md:w-6 md:h-6" />
                                        </button>
                                    </>
                                )}
                            </div>
                            {profile.is_verified && (
                                <div className="absolute top-2 right-2 bg-white dark:bg-card p-0.5 rounded-full z-20 shadow-lg">
                                    <ShieldCheck className="w-5 h-5 text-white fill-sky-500" />
                                </div>
                            )}
                        </div>

                        {isOwnProfile && (
                            <button 
                                onClick={() => setIsEditIntroOpen(true)}
                                className="absolute top-4 right-5 md:top-8 md:right-10 p-2 text-slate-400 hover:text-primary transition-colors"
                            >
                                <Pencil className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                        )}

                        {/* Profile Info */}
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-xl md:text-3xl font-bold text-slate-900 dark:text-white capitalize tracking-tight">
                                        {profile.full_name}
                                    </h1>
                                    {profile.profile_settings?.showVerificationBadge !== false && (
                                        <Badge variant="outline" className="h-5 px-2 text-[10px] font-bold border-sky-500/20 text-sky-600 gap-1">
                                            <ShieldCheck className="w-3 h-3 text-white fill-sky-500" /> VERIFIED
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-base md:text-lg font-medium text-slate-800 dark:text-slate-200">
                                    {profile.headline || profile.specialty || "Expert Professional"}
                                </p>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    <span className="flex items-center gap-1">
                                        {[profile.city, profile.state, profile.country].filter(Boolean).join(', ')}
                                    </span>
                                    <span className="hidden sm:inline text-slate-300">•</span>
                                    <button 
                                        onClick={() => setShowContactInfo(!showContactInfo)}
                                        className="text-primary hover:underline font-bold text-sm"
                                    >
                                        Contact info
                                    </button>
                                </div>
                                
                                {role === 'professional' && (
                                    <div className="flex items-center gap-2 text-sm font-semibold text-primary mt-2">
                                        <span className="hover:underline cursor-pointer">{profile.followers_count || 0} followers</span>
                                        <span className="text-slate-300">•</span>
                                        <span className="hover:underline cursor-pointer">{profile.connections_count || 0} connections</span>
                                    </div>
                                )}
                            </div>

                            {/* Contact Info Reveal */}
                            {showContactInfo && (
                                <div className="p-4 md:p-6 rounded-2xl bg-primary/5 border border-primary/10 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-sky-600 flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4 text-white fill-sky-500" /> Verified Contact Details
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-primary shadow-sm">
                                                <Mail className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Email Address</p>
                                                <a href={`mailto:${profile.email || 'contact@expert.com'}`} className="text-sm font-bold text-slate-900 dark:text-white hover:underline">
                                                    {profile.email || "Verification Pending"}
                                                </a>
                                            </div>
                                        </div>
                                        {profile.profile_settings?.showPhone !== false && profile.phone && (
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-primary shadow-sm">
                                                    <Phone className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Phone Number</p>
                                                    <a href={`tel:${profile.phone}`} className="text-sm font-bold text-slate-900 dark:text-white hover:underline">
                                                        {profile.phone}
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-medium italic">
                                        * Please mention "Material Insight" when contacting this professional.
                                    </p>
                                </div>
                            )}

                            {/* Action Pills */}
                            <div className="flex flex-wrap gap-2 pt-2 pb-1">
                                {isOwnProfile ? (
                                    <>
                                        <Button className="h-10 rounded-full px-6 bg-primary text-white font-bold text-sm shadow-md hover:scale-[1.02] transition-transform">
                                            Open to
                                        </Button>
                                        <Button variant="outline" className="h-10 rounded-full px-6 border-primary text-primary font-bold text-sm hover:bg-primary/5">
                                            Add section
                                        </Button>
                                        
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" className="h-10 w-10 md:w-auto md:px-6 rounded-full border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400 font-bold p-0">
                                                    <MoreHorizontal className="w-5 h-5 mx-auto md:mr-2" />
                                                    <span className="hidden md:inline">More</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 border-slate-100 dark:border-white/5 shadow-2xl bg-white dark:bg-slate-900 overflow-hidden">
                                                <DropdownMenuItem onClick={() => navigate('/settings')} className="rounded-xl gap-3 py-3 px-4 cursor-pointer focus:bg-slate-100 dark:focus:bg-white/10 transition-colors">
                                                    <SettingsIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" /> 
                                                    <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">Account Settings</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator className="my-1 bg-slate-100 dark:bg-white/5" />
                                                <DropdownMenuItem onClick={logout} className="rounded-xl gap-3 py-3 px-4 text-red-500 focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-500/10 cursor-pointer font-bold text-sm">
                                                    <LogOut className="w-4 h-4" /> Logout
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </>
                                ) : role === 'professional' ? (
                                    <>
                                        <Button className="flex-1 sm:flex-none h-10 rounded-full px-8 bg-primary text-white font-bold text-sm">
                                            <UserPlus className="w-4 h-4 mr-2" /> Connect
                                        </Button>
                                        <Button variant="outline" className="flex-1 sm:flex-none h-10 rounded-full px-8 border-primary text-primary font-bold text-sm hover:bg-primary/5">
                                            Message
                                        </Button>
                                    </>
                                ) : (
                                    <Button 
                                        onClick={() => setShowContactInfo(!showContactInfo)}
                                        className="w-full md:w-auto h-12 rounded-full px-12 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all"
                                    >
                                        <Mail className="w-4 h-4 mr-2" />
                                        {showContactInfo ? "Hide Contact" : "Contact Expert"}
                                    </Button>
                                )}
                            </div>

                            {/* Premium Enhancement Card (LinkedIn-like) */}
                            {isOwnProfile && (
                                <div className="mt-4 p-4 rounded-2xl bg-slate-900/5 dark:bg-white/5 border border-slate-100 dark:border-white/5 group cursor-pointer hover:bg-slate-950/5 transition-colors">
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                            <CheckCircle2 className="w-6 h-6" />
                                        </div>
                                        <div className="space-y-0.5">
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Enhance your profile with the help of AI</h4>
                                            <p className="text-xs text-slate-500 line-clamp-2">Stand out for almost 2x more opportunities by optimizing your summary and skills.</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* About / Summary Section (Tailored for Evaluation) */}
                <Card className="border-none shadow-xl rounded-none md:rounded-[2.5rem] bg-white dark:bg-card">
                    <CardContent className="p-6 md:p-10 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg md:text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white flex items-center gap-3">
                                Professional Summary
                            </h2>
                            {isOwnProfile && (
                                <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    onClick={() => setIsEditIntroOpen(true)}
                                    className="rounded-full h-10 w-10 text-slate-950 dark:text-white hover:text-primary hover:bg-primary/5 transition-all duration-300 group/edit"
                                >
                                    <Pencil className="w-4 h-4 group-hover/edit:scale-110 transition-transform" />
                                </Button>
                            )}
                        </div>
                        <div className="prose prose-slate dark:prose-invert max-w-none">
                            <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 leading-relaxed font-medium whitespace-pre-wrap">
                                {profile.bio || `${profile.full_name} is a highly skilled ${profile.specialty || 'expert'} dedicated to delivering premium professional services in the AEC industry.`}
                            </p>
                        </div>
                    </CardContent>
                </Card>



                {/* Experience Section */}
                <Card className="border-none shadow-xl rounded-none md:rounded-[2.5rem] bg-white dark:bg-card">
                    <CardContent className="p-6 md:p-10 space-y-8">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg md:text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white flex items-center gap-3">
                                Experience
                            </h2>
                            {isOwnProfile && (
                                <div className="flex gap-2">
                                    <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        onClick={() => setIsAddExpOpen(true)}
                                        className="rounded-full h-10 w-10 text-slate-950 dark:text-white hover:text-primary hover:bg-primary/5 transition-all duration-300 group/edit"
                                    >
                                        <Plus className="w-5 h-5 group-hover/edit:scale-110 transition-transform" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="rounded-full h-10 w-10 text-slate-950 dark:text-white hover:text-primary hover:bg-primary/5 transition-all duration-300 group/edit">
                                        <Pencil className="w-4 h-4 group-hover/edit:scale-110 transition-transform" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4 divide-y divide-slate-100 dark:divide-white/5">
                            {experiences.length > 0 ? (
                                experiences.map((exp) => (
                                    <ExperienceCard 
                                        key={exp.id} 
                                        experience={exp} 
                                        isEditable={isOwnProfile} 
                                    />
                                ))
                            ) : (
                                <div className="text-center py-10 text-slate-400 italic">
                                    <Clock className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                    <p className="text-xs font-bold uppercase tracking-widest">No experiences listed yet.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>



            </main>

            <AddExperienceDialog 
                isOpen={isAddExpOpen}
                onClose={() => setIsAddExpOpen(false)}
                professionalId={id!}
                onExperienceAdded={fetchProfileData}
            />

            <EditIntroDialog
                isOpen={isEditIntroOpen}
                onClose={() => setIsEditIntroOpen(false)}
                profile={profile}
                onProfileUpdated={fetchProfileData}
            />
        </div>
    );
};

export default ProfessionalProfile;
