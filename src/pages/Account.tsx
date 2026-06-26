import { motion } from 'motion/react';
import { User, Bell, Shield, Upload, Globe } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getData as getCountries } from 'country-list';

export function Account() {
  const { user } = useAuth();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  
  // New profile fields
  const [bio, setBio] = useState('');
  const [industry, setIndustry] = useState('');
  const [country, setCountry] = useState('');
  const [learningGoal, setLearningGoal] = useState('');
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState('');
  
  // Portfolio fields
  const [isPublic, setIsPublic] = useState(false);
  const [linkedin, setLinkedin] = useState('');
  const [twitter, setTwitter] = useState('');
  const [website, setWebsite] = useState('');

  const [avatarUrl, setAvatarUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  const [password, setPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  const timezones = Intl.supportedValuesOf('timeZone');
  const countries = getCountries();

  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || '');
      setEmail(user.email || '');
      setBio(user.user_metadata?.bio || '');
      setIndustry(user.user_metadata?.industry || '');
      setCountry(user.user_metadata?.country || '');
      setLearningGoal(user.user_metadata?.learning_goal || '');
      setPhone(user.user_metadata?.phone || '');
      setTimezone(user.user_metadata?.timezone || '');
      setIsPublic(user.user_metadata?.is_public || false);
      setLinkedin(user.user_metadata?.linkedin || '');
      setTwitter(user.user_metadata?.twitter || '');
      setWebsite(user.user_metadata?.website || '');
      setAvatarUrl(user.user_metadata?.avatar_url || '');
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileMessage('');
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        bio,
        industry,
        country,
        learning_goal: learningGoal,
        phone,
        timezone,
        is_public: isPublic,
        linkedin,
        twitter,
        website,
        avatar_url: avatarUrl
      }
    });
    setSavingProfile(false);
    if (error) {
      setProfileMessage('Error saving profile');
    } else {
      setProfileMessage('Profile saved successfully');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setChangingPassword(true);
    setPasswordMessage('');
    const { error } = await supabase.auth.updateUser({
      password: password
    });
    setChangingPassword(false);
    if (error) {
      setPasswordMessage('Error changing password');
    } else {
      setPasswordMessage('Password updated successfully');
      setPassword('');
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      setAvatarUrl(data.publicUrl);
      
      await supabase.auth.updateUser({
        data: { avatar_url: data.publicUrl }
      });

    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto py-10 space-y-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">Account</h1>
        <p className="text-white/50 text-sm">Manage your personal profile, portfolio, and settings.</p>
      </div>

      <div className="space-y-6">
        {/* Personal Profile */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-[#111113] border border-white/10 rounded-2xl overflow-hidden"
        >
          <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/3">
              <div className="flex items-center gap-3 mb-2 text-white">
                <User size={20} className="text-blue-400" />
                <h3 className="font-medium text-lg">Your personal profile</h3>
              </div>
              <p className="text-sm text-white/50">Used internally on dashboards, leaderboards, and your public portfolio.</p>
            </div>
            
            <div className="flex-1 space-y-6">
              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Profile photo</label>
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User size={32} className="text-white/30" />
                    )}
                  </div>
                  <div>
                    <input 
                      type="file" 
                      accept="image/jpeg, image/png, image/webp, image/gif" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 transition-colors rounded-lg text-sm font-medium text-white disabled:opacity-50"
                    >
                      <Upload size={16} />
                      {uploading ? 'Uploading...' : 'Upload photo'}
                    </button>
                    <p className="text-xs text-white/40 mt-2">JPEG, PNG, WebP or GIF. Max 5 MB.</p>
                  </div>
                </div>
              </div>

              {/* Basic Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-white/60 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-white/60 mb-1 flex justify-between">
                    <span>Short bio</span>
                    <span>{bio.length}/300</span>
                  </label>
                  <textarea 
                    value={bio}
                    onChange={e => setBio(e.target.value.slice(0, 300))}
                    placeholder="E.g. Marketing professional exploring AI tools"
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-white/30 transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1">Industry</label>
                  <input 
                    type="text" 
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1">Country</label>
                  <select 
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-white/30 transition-colors appearance-none"
                  >
                    <option value="" disabled className="bg-[#111113] text-white/50">Select your country</option>
                    {countries.map(c => (
                      <option key={c.code} value={c.name} className="bg-[#111113]">{c.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1">Learning goal</label>
                  <input 
                    type="text" 
                    value={learningGoal}
                    onChange={e => setLearningGoal(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1">Phone</label>
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-white/60 mb-1">Timezone</label>
                  <select 
                    value={timezone}
                    onChange={e => setTimezone(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-white/30 transition-colors appearance-none"
                  >
                    <option value="" disabled className="bg-[#111113] text-white/50">Select your timezone</option>
                    {timezones.map(tz => (
                      <option key={tz} value={tz} className="bg-[#111113]">{tz}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Public Portfolio */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="bg-[#111113] border border-white/10 rounded-2xl overflow-hidden"
        >
          <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/3">
              <div className="flex items-center gap-3 mb-2 text-white">
                <Globe size={20} className="text-blue-400" />
                <h3 className="font-medium text-lg">Public portfolio</h3>
              </div>
              <p className="text-sm text-white/50">What employers and the public see when they visit your portfolio URL.</p>
            </div>
            
            <div className="flex-1 space-y-6">
              <label className="flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer group gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                <div>
                  <span className="block text-sm font-medium text-white group-hover:text-white transition-colors">Make my portfolio public</span>
                  <span className="text-xs text-white/40 mt-1 block">When on, anyone with your link can view your portfolio.</span>
                </div>
                <div onClick={() => setIsPublic(!isPublic)} className={`w-12 h-7 rounded-full transition-colors relative flex items-center px-1 shrink-0 ${isPublic ? 'bg-emerald-500' : 'bg-white/10'}`}>
                  <motion.div 
                    layout
                    className="w-5 h-5 bg-white rounded-full"
                    animate={{ x: isPublic ? 20 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </div>
              </label>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1">LinkedIn</label>
                  <input 
                    type="url" 
                    value={linkedin}
                    onChange={e => setLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1">Twitter / X</label>
                  <input 
                    type="url" 
                    value={twitter}
                    onChange={e => setTwitter(e.target.value)}
                    placeholder="https://twitter.com/..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1">Website</label>
                  <input 
                    type="url" 
                    value={website}
                    onChange={e => setWebsite(e.target.value)}
                    placeholder="https://yoursite.com"
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Security */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="bg-[#111113] border border-white/10 rounded-2xl overflow-hidden"
        >
          <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/3">
              <div className="flex items-center gap-3 mb-2 text-white">
                <Shield size={20} className="text-blue-400" />
                <h3 className="font-medium text-lg">Security</h3>
              </div>
              <p className="text-sm text-white/50">Update password and authentication methods.</p>
            </div>
            
            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  disabled
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white/50 cursor-not-allowed"
                />
                <p className="text-[10px] text-white/30 mt-1">Email cannot be changed directly.</p>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4 pt-2 border-t border-white/5">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1">New Password</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    type="submit"
                    disabled={changingPassword || !password}
                    className="px-5 py-2 bg-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
                  >
                    {changingPassword ? 'Updating...' : 'Change Password'}
                  </button>
                  {passwordMessage && <span className="text-sm text-white/60">{passwordMessage}</span>}
                </div>
              </form>
            </div>
          </div>
        </motion.div>

        {/* Global Save Button */}
        <div className="sticky bottom-8 flex items-center justify-end gap-4 p-4 bg-[#09090b]/80 backdrop-blur-md rounded-2xl border border-white/10">
          {profileMessage && <span className="text-sm text-white/60">{profileMessage}</span>}
          <button 
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="px-6 py-2.5 bg-white text-black text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {savingProfile ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
