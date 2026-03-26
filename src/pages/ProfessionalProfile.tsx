import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
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
    Camera
} from "lucide-react";
import ExperienceCard from "@/components/pro/ExperienceCard";
import AddExperienceDialog from "@/components/pro/AddExperienceDialog";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useRef } from "react";

const ProfessionalProfile = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [experiences, setExperiences] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddExpOpen, setIsAddExpOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const isOwnProfile = user?.id === id;

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
                    subscription_status: 'trial' as 'trial' | 'active' | 'expired'
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
            
            <main className="container mx-auto px-4 pt-6 md:pt-10 max-w-5xl space-y-6">
                
                {/* Header Card (LinkedIn Style) */}
                <Card className="overflow-hidden border-none shadow-xl rounded-[2.5rem] bg-white dark:bg-card relative">
                    {/* Cover Photo */}
                    <div className="h-32 md:h-48 bg-slate-200 dark:bg-white/5 relative overflow-hidden group">
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
                            <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900" />
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
                                    className="absolute bottom-4 right-4 p-3 bg-slate-950 text-white rounded-full shadow-2xl transition-all duration-300 hover:bg-primary border-2 border-white/20 group/cam"
                                >
                                    <Camera className="w-5 h-5 group-hover/cam:scale-110 transition-transform" />
                                </button>
                            </>
                        )}
                    </div>

                    <CardContent className="px-6 md:px-10 pb-10">
                        {/* Avatar Overlay */}
                        <div className="relative -mt-12 md:-mt-20 mb-4 inline-block group">
                            <div className="w-24 h-24 md:w-36 md:h-36 rounded-full border-4 md:border-8 border-white dark:border-card overflow-hidden bg-slate-100 shadow-2xl relative">
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
                                            className="absolute bottom-1 right-1 p-2.5 bg-slate-950 text-white rounded-full shadow-2xl transition-all duration-300 hover:bg-primary border-2 border-white/20 z-30 group/avatar-cam"
                                        >
                                            <Camera className="w-4 h-4 group-hover/avatar-cam:scale-110 transition-transform" />
                                        </button>
                                    </>
                                )}
                            </div>
                            {profile.is_verified && (
                                <div className="absolute top-2 right-2 bg-primary text-white p-1.5 rounded-full border-4 border-white dark:border-card shadow-lg z-20">
                                    <ShieldCheck className="w-4 h-4 md:w-5 md:h-5" />
                                </div>
                            )}
                        </div>

                        {/* Profile Info */}
                        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                    <h1 className="text-xl md:text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
                                        {profile.full_name}
                                    </h1>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded">
                                        Professional
                                    </span>
                                </div>
                                <p className="text-sm md:text-lg font-bold text-slate-700 dark:text-slate-300 italic">
                                    {profile.headline || profile.specialty}
                                </p>
                                <div className="flex flex-wrap items-center gap-4 text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400">
                                    <span className="flex items-center gap-1.5">
                                        <MapPin className="w-3.5 h-3.5 text-primary" />
                                        {profile.city}, {profile.country}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <LinkIcon className="w-3.5 h-3.5 text-primary" />
                                        <button 
                                            onClick={() => toast.info("Contact info: " + (profile.phone || profile.email || "No details provided"))}
                                            className="text-primary hover:underline"
                                        >
                                            Contact info
                                        </button>
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Users className="w-3.5 h-3.5 text-primary" />
                                        {profile.connections_count || 0} connections
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3 w-full md:w-auto">
                                {isOwnProfile ? (
                                    <>
                                        <Button 
                                            onClick={() => toast.info("Setting your 'Open to' status...")}
                                            className="flex-1 md:flex-none h-11 rounded-full px-8 bg-primary hover:bg-primary/90 font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20"
                                        >
                                            Open to
                                        </Button>
                                        <Button 
                                            onClick={() => toast.info("Select a section to add (Bio, Skills, Projects)...")}
                                            variant="outline" 
                                            className="flex-1 md:flex-none h-11 rounded-full px-8 border-2 border-primary text-primary hover:bg-primary/5 font-black uppercase tracking-widest text-xs"
                                        >
                                            Add section
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button className="flex-1 md:flex-none h-11 rounded-full px-8 bg-primary hover:bg-primary/90 font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20">
                                            <UserPlus className="w-4 h-4 mr-2" />
                                            Connect
                                        </Button>
                                        <Button variant="outline" className="flex-1 md:flex-none h-11 rounded-full px-8 border-2 border-primary text-primary hover:bg-primary/5 font-black uppercase tracking-widest text-xs">
                                            <MessageCircle className="w-4 h-4 mr-2" />
                                            Message
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Bio Section */}
                        {profile.bio && (
                            <div className="mt-10 p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5 italic">
                                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-4xl">
                                    {profile.bio}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Experience Section */}
                <Card className="border-none shadow-xl rounded-[2.5rem] bg-white dark:bg-card">
                    <CardContent className="p-8 md:p-10 space-y-8">
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
        </div>
    );
};

export default ProfessionalProfile;
