import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  GraduationCap,
  Building2,
  Mail,
  ShieldCheck,
  Calendar,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  Shield,
  FileText,
  BadgeCheck,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Save,
  Upload,
  AlertCircle,
  Sparkles,
  Phone,
  Info,
  Check,
} from 'lucide-react';
import { StudentProfile, TeacherProfile, AuthUser } from '../../types';
import {
  getStoredStudents,
  getStoredTeachers,
  updateStudent,
  updateTeacher,
  getStoredSuperAdmin,
  saveStoredSuperAdmin,
  verifyUserPassword,
  updateUserPassword,
} from '../../services/storageService';
import { InstitutionLogo } from './InstitutionLogo';

interface ProfileDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'student' | 'teacher' | 'admin';
  targetId: string;
  fallbackData?: StudentProfile | TeacherProfile | AuthUser;
  currentUser?: AuthUser | null;
  onProfileUpdated?: () => void;
}

export const ProfileDetailModal: React.FC<ProfileDetailModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  fallbackData,
  currentUser,
  onProfileUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'view' | 'edit'>('view');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);

  // Form Edit State
  const [nameDraft, setNameDraft] = useState('');
  const [emailDraft, setEmailDraft] = useState('');
  const [phoneDraft, setPhoneDraft] = useState('');
  const [bioDraft, setBioDraft] = useState('');
  const [officeDraft, setOfficeDraft] = useState('');
  const [titleDraft, setTitleDraft] = useState('');
  const [avatarDraft, setAvatarDraft] = useState('');

  // Password Update State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Feedback State
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Calculate Password Strength
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'Not Entered', color: 'bg-slate-300' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 20, label: 'Weak', color: 'bg-rose-500' };
    if (score === 2) return { score: 45, label: 'Fair', color: 'bg-amber-500' };
    if (score === 3 || score === 4) return { score: 75, label: 'Strong', color: 'bg-indigo-500' };
    return { score: 100, label: 'Excellent & Secure', color: 'bg-emerald-500' };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  useEffect(() => {
    if (!isOpen || !targetId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setSaveSuccess(null);
    setSaveError(null);

    const normalizedTarget = targetId.trim().toLowerCase();

    // 1. Check if Admin
    if (targetType === 'admin') {
      const adminData = getStoredSuperAdmin();
      if (isMounted) {
        setProfileData(adminData);
        populateDrafts(adminData);
        setLoading(false);
      }
      return;
    }

    const endpoint =
      targetType === 'student'
        ? `/api/students/${encodeURIComponent(targetId)}`
        : `/api/teachers/${encodeURIComponent(targetId)}`;

    const localProfile =
      fallbackData ||
      (targetType === 'student'
        ? getStoredStudents().find((student) =>
            [student.id, student.studentNumber, student.email].some(
              (value) => value?.trim().toLowerCase() === normalizedTarget
            )
          )
        : getStoredTeachers().find((teacher) =>
            [teacher.id, teacher.staffId, teacher.email].some(
              (value) => value?.trim().toLowerCase() === normalizedTarget
            )
          ));

    const loadProfile = async () => {
      try {
        const response = await fetch(endpoint, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}: Failed to fetch from institutional database`);
        }
        const json = await response.json();
        if (!json.success || !json.data) {
          throw new Error('Profile record was not returned by the institutional database.');
        }
        if (isMounted) {
          const merged = { ...localProfile, ...json.data };
          setProfileData(merged);
          populateDrafts(merged);
          setLoading(false);
        }
      } catch (err) {
        if (!isMounted) return;
        if (localProfile) {
          setProfileData(localProfile);
          populateDrafts(localProfile);
          setError(null);
        } else {
          setProfileData(null);
          setError(err instanceof Error ? err.message : 'Unable to retrieve academic profile.');
        }
        setLoading(false);
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [isOpen, targetId, targetType, fallbackData]);

  const populateDrafts = (data: any) => {
    setNameDraft(data?.name || '');
    setEmailDraft(data?.email || '');
    setPhoneDraft(data?.phone || '');
    setBioDraft(data?.bio || '');
    setOfficeDraft(data?.office || data?.officeLocation || data?.program || '');
    setTitleDraft(data?.title || '');
    setAvatarDraft(data?.avatar || '');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle Photo Upload
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setSaveError('Image file is too large. Please select a photo under 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarDraft(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Save Profile & Password
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(null);
    setIsSaving(true);

    try {
      const email = emailDraft.trim() || profileData?.email;

      // 1. Password Verification & Update (if user wants to change password)
      if (newPassword || currentPassword || confirmPassword) {
        if (!currentPassword) {
          throw new Error('Please enter your current password to authorize a password change.');
        }
        const isCurrentValid = verifyUserPassword(targetType, email, currentPassword);
        if (!isCurrentValid) {
          throw new Error(
            'The current password entered is incorrect. (Default passwords: password, examguard2026, or your admission/staff number)'
          );
        }
        if (newPassword.length < 6) {
          throw new Error('Your new password must be at least 6 characters in length.');
        }
        if (newPassword !== confirmPassword) {
          throw new Error('The new password and confirmation password do not match.');
        }

        const passResult = updateUserPassword(targetType, email, newPassword);
        if (!passResult.success) {
          throw new Error(passResult.error || 'Failed to update password.');
        }
      }

      // 2. Profile Details Update
      const updatedTimestamp = new Date().toISOString();
      const updatedProfile = {
        ...profileData,
        name: nameDraft.trim() || profileData.name,
        email: emailDraft.trim() || profileData.email,
        phone: phoneDraft.trim(),
        bio: bioDraft.trim(),
        avatar: avatarDraft.trim() || profileData.avatar,
        title: titleDraft.trim() || profileData.title,
        ...(targetType === 'teacher' ? { office: officeDraft.trim() } : {}),
        ...(targetType === 'admin' ? { officeLocation: officeDraft.trim() } : {}),
        lastPasswordChangedAt: newPassword ? updatedTimestamp : profileData.lastPasswordChangedAt,
      };

      if (targetType === 'teacher') {
        updateTeacher(updatedProfile);
        try {
          await fetch(`/api/teachers/${encodeURIComponent(profileData.id || targetId)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedProfile),
          });
        } catch {}
      } else if (targetType === 'student') {
        updateStudent(updatedProfile);
        try {
          await fetch(`/api/students/${encodeURIComponent(profileData.id || targetId)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedProfile),
          });
        } catch {}
      } else if (targetType === 'admin') {
        saveStoredSuperAdmin(updatedProfile);
      }

      setProfileData(updatedProfile);
      setSaveSuccess(
        newPassword
          ? 'Profile details and password successfully updated in institutional database!'
          : 'Profile details successfully updated and synchronized!'
      );
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      if (onProfileUpdated) {
        onProfileUpdated();
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update user profile.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative cursor-default"
      >
        {/* Sticky Top Header Bar with Tab Navigation */}
        <div className="sticky top-0 z-50 bg-slate-950 px-4 py-2.5 border-b border-indigo-900/60 flex items-center justify-between text-white shrink-0 shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono tracking-tight text-cyan-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Verified Institutional Profile & Security</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-800/90 rounded-xl p-0.5 border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('view')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  activeTab === 'view'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                View Credentials
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                  activeTab === 'edit'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>Edit & Password</span>
              </button>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              aria-label="Close Profile Window"
              title="Close Profile Window (Esc)"
              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
            >
              <X className="w-3.5 h-3.5" />
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* Scrollable Container covering Hue Section and Profile Details */}
        <div className="flex-1 overflow-y-auto">
          {/* Academic Institutional Modal Top Banner (Hue Section) */}
          <div
            className="p-6 text-white relative shrink-0 overflow-hidden bg-slate-900 border-b border-indigo-900/60"
            style={{
              backgroundImage: "url('/campus-hero-banner.jpg')",
              backgroundPosition: 'center',
              backgroundSize: 'cover',
              backgroundRepeat: 'no-repeat',
            }}
          >
            <div
              className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-blue-950/50 via-40% to-transparent to-70% pointer-events-none z-0"
              aria-hidden="true"
            />

            <div className="relative z-10 flex items-center gap-3 mb-3">
              <InstitutionLogo size="sm" />
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-300 font-semibold drop-shadow-xs">
                  Rifkins Education College
                </div>
              </div>
            </div>

            <div className="relative z-10 flex items-center gap-4 pt-1">
              <img
                src={
                  avatarDraft ||
                  profileData?.avatar ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                }
                alt={profileData?.name || 'Profile Avatar'}
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-indigo-400 shadow-md bg-slate-800 shrink-0"
              />
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold tracking-tight text-white truncate drop-shadow-md">
                    {profileData?.name || 'Academic Record'}
                  </h3>
                  <BadgeCheck className="w-5 h-5 text-cyan-400 shrink-0" />
                </div>
                <div className="text-xs text-indigo-200 font-mono flex items-center gap-1.5 mt-0.5 drop-shadow-xs">
                  <span className="text-sm font-bold text-white">
                    {targetType === 'student'
                      ? profileData?.studentNumber || 'ADM-CS-2026'
                      : targetType === 'teacher'
                      ? profileData?.staffId || 'FAC-CS-8902'
                      : 'DIR-SENATE-001'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="capitalize">{targetType} Profile</span>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-6 space-y-5">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-mono text-slate-500">
                  Fetching academic credentials from backend server...
                </p>
              </div>
            ) : error ? (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
                {error}
              </div>
            ) : activeTab === 'view' ? (
              /* VIEW MODE */
              <>
                {/* Common Information Block */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      Institutional Email
                    </span>
                    <div className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate">{profileData?.email}</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      Academic Department
                    </span>
                    <div className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate">{profileData?.department}</span>
                    </div>
                  </div>

                  {profileData?.faculty && (
                    <div className="sm:col-span-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                        Faculty / Directorate
                      </span>
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {profileData.faculty}
                      </div>
                    </div>
                  )}

                  {profileData?.phone && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                        Direct Phone Contact
                      </span>
                      <div className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>{profileData.phone}</span>
                      </div>
                    </div>
                  )}

                  {profileData?.lastPasswordChangedAt && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 space-y-1">
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Password Security</span>
                      </span>
                      <div className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                        Updated {new Date(profileData.lastPasswordChangedAt).toLocaleDateString()} at{' '}
                        {new Date(profileData.lastPasswordChangedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Student-Specific Information */}
                {targetType === 'student' && (
                  <div className="space-y-4 pt-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-emerald-500" />
                      <span>Candidate Academic Metrics & Invigilation Clearance</span>
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono uppercase block">
                          Cumulative GPA
                        </span>
                        <span className="text-lg font-bold font-mono text-emerald-900 dark:text-emerald-200">
                          {profileData?.gpa || '3.92 / 4.00'}
                        </span>
                      </div>

                      <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60">
                        <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-mono uppercase block">
                          Attendance Rate
                        </span>
                        <span className="text-lg font-bold font-mono text-indigo-900 dark:text-indigo-200">
                          {profileData?.attendanceRate || '98.5%'}
                        </span>
                      </div>

                      <div className="p-3 rounded-2xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/60">
                        <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-mono uppercase block">
                          Earned Credits
                        </span>
                        <span className="text-lg font-bold font-mono text-cyan-900 dark:text-cyan-200">
                          {profileData?.creditsCompleted || 88} ECTS
                        </span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Degree Program:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {profileData?.program || 'B.Sc. Computer Science (Honors)'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Academic Standing:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {profileData?.academicStanding || "Dean's Honor Roll"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Proctoring Clearance:</span>
                        <span className="font-semibold text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {profileData?.clearanceStatus || 'Verified & Cleared'}
                        </span>
                      </div>
                    </div>

                    {profileData?.enrolledCourseCodes && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-mono text-slate-500">
                          Enrolled Examination Courses:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {profileData.enrolledCourseCodes.map((code: string) => (
                            <span
                              key={code}
                              className="px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-mono text-xs font-semibold"
                            >
                              {code}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Teacher-Specific Information */}
                {targetType === 'teacher' && (
                  <div className="space-y-4 pt-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-indigo-500" />
                      <span>Faculty Appointment & Invigilation Clearance</span>
                    </h4>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Academic Title:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {profileData?.title || 'Professor of Computer Science'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Faculty Office:</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {profileData?.office || 'Turing Hall, Room 412B'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Security Clearance:</span>
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                          {profileData?.securityClearance || 'Level 4 · Chief Academic Invigilator'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Account Access Status:</span>
                        <span
                          className={`font-semibold capitalize px-2 py-0.5 rounded text-[10px] ${
                            profileData?.accessStatus === 'active'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {profileData?.accessStatus || 'active'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Call to Action to Update Details / Password */}
                <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <KeyRound className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <div>
                      <div className="font-bold text-xs text-indigo-950 dark:text-indigo-100">
                        Update Password & Profile Credentials
                      </div>
                      <div className="text-[11px] text-indigo-700 dark:text-indigo-300">
                        Keep your institutional access credentials secure with a custom password.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('edit')}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
                  >
                    Change Password
                  </button>
                </div>
              </>
            ) : (
              /* EDIT & PASSWORD CHANGE MODE */
              <form onSubmit={handleSaveProfile} className="space-y-5 text-xs">
                {saveSuccess && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{saveSuccess}</span>
                  </div>
                )}

                {saveError && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-center gap-2 font-medium">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{saveError}</span>
                  </div>
                )}

                {/* Profile Photo Uploader Section */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
                  <label className="block font-bold text-slate-800 dark:text-slate-200">
                    Profile Avatar Photo
                  </label>
                  <div className="flex items-center gap-4">
                    <img
                      src={
                        avatarDraft ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                      }
                      alt="Avatar Preview"
                      className="w-14 h-14 rounded-2xl object-cover ring-2 ring-indigo-500/50 shadow-xs shrink-0"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-xs transition-colors">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarUpload}
                          />
                        </label>
                        {avatarDraft && (
                          <button
                            type="button"
                            onClick={() => setAvatarDraft('')}
                            className="text-xs text-rose-600 hover:text-rose-500 px-2 py-1"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      <input
                        type="url"
                        value={avatarDraft}
                        onChange={(e) => setAvatarDraft(e.target.value)}
                        placeholder="Or enter direct image URL..."
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-[11px] text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Personal Information Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Full Academic Name
                    </label>
                    <input
                      type="text"
                      required
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Institutional Email
                    </label>
                    <input
                      type="email"
                      required
                      value={emailDraft}
                      onChange={(e) => setEmailDraft(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Direct Telephone Contact
                    </label>
                    <input
                      type="text"
                      value={phoneDraft}
                      onChange={(e) => setPhoneDraft(e.target.value)}
                      placeholder="+1 (555) 012-3456"
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {targetType === 'student' ? 'Program / Specialization' : 'Office Location'}
                    </label>
                    <input
                      type="text"
                      value={officeDraft}
                      onChange={(e) => setOfficeDraft(e.target.value)}
                      placeholder={targetType === 'student' ? 'B.Sc. Computer Science' : 'Turing Hall, Room 412B'}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Bio / Academic Profile Statement
                  </label>
                  <textarea
                    rows={2}
                    value={bioDraft}
                    onChange={(e) => setBioDraft(e.target.value)}
                    placeholder="Brief description of research focus, areas of study, or academic responsibilities..."
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Password Change Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border-2 border-amber-300/80 dark:border-amber-800/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          Change Account Password
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Leave blank if you do not wish to update your login password.
                        </p>
                      </div>
                    </div>

                    {profileData?.lastPasswordChangedAt && (
                      <span className="text-[10px] font-mono text-slate-400 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                        Last changed: {new Date(profileData.lastPasswordChangedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="space-y-3 pt-1">
                    {/* Current Password */}
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Current Password <span className="text-slate-400 font-normal">(Required to authorize change)</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPass ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter your existing password (default: password or examguard2026)"
                          className="w-full p-2.5 pr-10 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPass(!showCurrentPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* New Password */}
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPass ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="At least 6 characters"
                            className="w-full p-2.5 pr-10 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPass(!showNewPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          >
                            {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Confirm New Password */}
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPass ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-type new password"
                            className="w-full p-2.5 pr-10 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-mono text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPass(!showConfirmPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          >
                            {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Password Strength Meter */}
                    {newPassword && (
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-600 dark:text-slate-400">
                            Password Strength:
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {passwordStrength.label}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${passwordStrength.score}%` }}
                            className={`h-full ${passwordStrength.color} transition-all duration-300`}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] text-slate-500 font-mono">
                          <div className={`flex items-center gap-1 ${newPassword.length >= 6 ? 'text-emerald-600 font-bold' : ''}`}>
                            <Check className="w-3 h-3" />
                            <span>Min 6 characters</span>
                          </div>
                          <div className={`flex items-center gap-1 ${/[A-Z]/.test(newPassword) ? 'text-emerald-600 font-bold' : ''}`}>
                            <Check className="w-3 h-3" />
                            <span>Uppercase letter</span>
                          </div>
                          <div className={`flex items-center gap-1 ${/[0-9]/.test(newPassword) ? 'text-emerald-600 font-bold' : ''}`}>
                            <Check className="w-3 h-3" />
                            <span>Includes number</span>
                          </div>
                          <div className={`flex items-center gap-1 ${/[^A-Za-z0-9]/.test(newPassword) ? 'text-emerald-600 font-bold' : ''}`}>
                            <Check className="w-3 h-3" />
                            <span>Special symbol</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      populateDrafts(profileData);
                      setActiveTab('view');
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
                  >
                    {isSaving ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>Save Profile & Password</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 shrink-0 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5">
            <span>Click outside or press</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              Esc
            </kbd>
            <span>to close</span>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'view' && (
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 font-bold text-xs border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Update Password & Info</span>
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <X className="w-4 h-4" />
              <span>Close</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
