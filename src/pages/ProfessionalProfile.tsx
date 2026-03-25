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

const ProfessionalProfile = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [experiences, setExperiences] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddExpOpen, setIsAddExpOpen] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending' | 'accepted'>('none');
    const [isFollowing, setIsFollowing] = useState(false);
    const isOwnProfile = user?.id === id;

    const fetchProfileData = async () => {
        if (!id) return;
        try {
            // Fetch basic profile info
            const { data: profData, error: profError } = await supabase
                .from('professionals')
                .select('*')
                .eq('id', id)
                .single();

            if (profError) throw profError;
            setProfile(profData);

            // Fetch connection status if logged in
            if (user?.id) {
                const { data: connData } = await supabase
                    .from('professional_connections' as any)
                    .select('status, requester_id')
                    .or(`and(requester_id.eq.${user.id},receiver_id.eq.${id}),and(requester_id.eq.${id},receiver_id.eq.${user.id})`)
                    .maybeSingle();
                
                if (connData) {
                    setConnectionStatus(connData.status as any);
                }

                const { data: followData } = await supabase
                    .from('professional_followers' as any)
                    .select('*')
                    .eq('follower_id', user.id)
                    .eq('following_id', id)
                    .maybeSingle();
                
                setIsFollowing(!!followData);
            }

            // Fetch experiences
            const { data: expData, error: expError } = await supabase
                .from('professional_experiences' as any)
                .select('*')
                .eq('professional_id', id)
                .order('start_date', { ascending: false });

            if (expError) throw expError;
            setExperiences(expData || []);

        } catch (err) {
            console.error("Error fetching profile:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConnect = async () => {
        if (!user?.id || !id) return;
        try {
            if (connectionStatus === 'none') {
                const { error } = await supabase
                    .from('professional_connections')
                    .insert({ requester_id: user.id, receiver_id: id, status: 'pending' });
                if (error) throw error;
                setConnectionStatus('pending');
            }
        } catch (err) {
            console.error("Error connecting:", err);
        }
    };

    const handleFollow = async () => {
        if (!user?.id || !id) return;
        try {
            if (!isFollowing) {
                await supabase.from('professional_followers').insert({ follower_id: user.id, following_id: id });
                setIsFollowing(true);
            } else {
                await supabase.from('professional_followers').delete().eq('follower_id', user.id).eq('following_id', id);
                setIsFollowing(false);
            }
        } catch (err) {
            console.error("Error following:", err);
        }
    };

    useEffect(() => {
        setIsLoading(true);
        fetchProfileData();
    }, [id, user?.id]);

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
                            <img src={profile.cover_url} className="w-full h-full object-cover" alt="cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900" />
                        )}
                        {isOwnProfile && (
                            <button className="absolute bottom-4 right-4 p-2 bg-white/80 dark:bg-black/50 backdrop-blur-md rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="w-4 h-4" />
                            </button>
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
                                />
                                {isOwnProfile && (
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="w-6 h-6 text-white" />
                                    </div>
                                )}
                            </div>
                            {profile.is_verified && (
                                <div className="absolute bottom-2 right-2 bg-primary text-white p-1.5 rounded-full border-4 border-white dark:border-card shadow-lg z-20">
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
                                        <button className="text-primary hover:underline">Contact info</button>
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
                                        <Button className="flex-1 md:flex-none h-11 rounded-full px-8 bg-primary hover:bg-primary/90 font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20">
                                            Open to
                                        </Button>
                                        <Button variant="outline" className="flex-1 md:flex-none h-11 rounded-full px-8 border-2 border-primary text-primary hover:bg-primary/5 font-black uppercase tracking-widest text-xs">
                                            Add section
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button 
                                            onClick={handleConnect}
                                            disabled={connectionStatus !== 'none'}
                                            className="flex-1 md:flex-none h-11 rounded-full px-8 bg-primary hover:bg-primary/90 font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20"
                                        >
                                            {connectionStatus === 'accepted' ? (
                                                <>Connected</>
                                            ) : connectionStatus === 'pending' ? (
                                                <>Pending</>
                                            ) : (
                                                <>
                                                    <UserPlus className="w-4 h-4 mr-2" />
                                                    Connect
                                                </>
                                            )}
                                        </Button>
                                        <Button 
                                            onClick={handleFollow}
                                            variant="outline" 
                                            className={`flex-1 md:flex-none h-11 rounded-full px-8 border-2 border-primary font-black uppercase tracking-widest text-xs ${isFollowing ? 'bg-primary text-white' : 'text-primary hover:bg-primary/5'}`}
                                        >
                                            {isFollowing ? 'Following' : 'Follow'}
                                        </Button>
                                        <Button variant="outline" className="flex-1 md:flex-none h-11 rounded-full px-8 border-2 border-slate-200 text-slate-600 hover:bg-slate-50 font-black uppercase tracking-widest text-xs">
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
                                        className="rounded-full h-10 w-10 text-slate-400 hover:text-primary hover:bg-primary/10"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="rounded-full h-10 w-10 text-slate-400 hover:text-primary hover:bg-primary/10">
                                        <Pencil className="w-4 h-4" />
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

                {isOwnProfile && profile && (
                    <AddExperienceDialog 
                        isOpen={isAddExpOpen} 
                        onClose={() => setIsAddExpOpen(false)}
                        professionalId={profile.id}
                        onExperienceAdded={fetchProfileData}
                    />
                )}

            </main>
        </div>
    );
};

export default ProfessionalProfile;
