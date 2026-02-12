/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import React, { useState, useEffect } from "react";
import { Mail, Lock, LogIn, UserPlus } from "lucide-react";
import InputField from "../../components/ui/InputField";
import Button from "../../components/ui/Button";
import ParichayOAuth from "../../components/oauth/ParichayOAuth";
import { loginUser, registerUser, resendActivationLink } from "../../services/user.api";
import { getAllowedDomains } from "../../services/settings.api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [mobileNo, setMobileNo] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const [resendStatus, setResendStatus] = useState<{ loading: boolean; success: boolean | null; message: string | null }>({
    loading: false,
    success: null,
    message: null
  });

  const isActivationError = error?.toLowerCase().includes("not activated") || error?.toLowerCase().includes("activation");

  useEffect(() => {
    // Fetch system settings
    getAllowedDomains().then(res => {
      if (res.success) {
        setAllowedDomains(res.data.allowedDomains);
      }
    });
  }, []);

  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Domain validation
    if (allowedDomains.length > 0) {
      const emailDomain = email.split('@')[1]?.toLowerCase();
      if (!emailDomain || !allowedDomains.includes(emailDomain)) {
        setError(`Access restricted to the following domains: ${allowedDomains.join(', ')}`);
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        const response = await loginUser({ email, password });
        if (response.success && response.data?.user) {
          const user = response.data.user;
          // Save access token to localStorage to ensure Authorization header is sent
          if (response.data.accessToken) {
            localStorage.setItem('accessToken', response.data.accessToken);
          }
          login({
            _id: user._id,
            fullName: user.fullName || "",
            email: user.email,
            labName: user.labName,
            designation: user.designation,
            division: user.division,
            status: user.status,
            isSubmitted: user.isSubmitted,
            role: user.role,
            availableRoles: user.availableRoles,
            mobileNo: user.mobileNo,
            avatar: user.avatar,
            initials: (user.fullName || user.email).slice(0, 2).toUpperCase(),
            hasApprovalAuthority: user.hasApprovalAuthority
          });

          const isApproved = user.status === 'Approved';
          const isProfileComplete = !!(user.labName && user.designation);

          if (!isApproved || !isProfileComplete) {
            navigate("/profile", {
              state: { message: "Your profile must be completed and approved by an administrator to access the portal features." }
            });
          } else {
            // We can try to navigate to references. If blocked, they go to / which is home.
            navigate("/");
          }
        } else {
          setError(response.message || "Login failed");
        }
      } else {
        // Mobile number validation
        if (mobileNo && (!/^\d+$/.test(mobileNo) || mobileNo.length !== 10)) {
          setError("Mobile number must be exactly 10 digits and numeric only");
          setIsLoading(false);
          return;
        }

        const response = await registerUser({
          email,
          password,
          mobileNo,
        });

        if (response.success) {
          setIsLogin(true);
          setPassword("");
          setConfirmPassword("");
          setError(response.message || "Registration successful! Please check your email to activate your account.");
        } else {
          setError(response.message || "Registration failed");
        }
      }
    } catch (err: any) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendActivation = async () => {
    if (!email) {
      setError("Please enter your email first");
      return;
    }

    setResendStatus({ loading: true, success: null, message: null });
    try {
      const response = await resendActivationLink({ email });
      if (response.success) {
        setResendStatus({ loading: false, success: true, message: "A new activation link has been sent to your email." });
        setError(null);
      } else {
        setResendStatus({ loading: false, success: false, message: response.message || "Failed to resend activation link" });
      }
    } catch (err) {
      setResendStatus({ loading: false, success: false, message: "An unexpected error occurred" });
    }
  };

  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Abstract Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-3xl animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-[30%] h-[30%] rounded-full bg-purple-500/5 blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[30%] h-[30%] rounded-full bg-blue-500/5 blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="w-full max-w-md relative">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20 dark:border-gray-700/50 ring-1 ring-black/5 transition-all duration-300">

          {/* Header Section */}
          <div className="relative p-8 pt-10 text-center bg-linear-to-b from-indigo-50/50 to-transparent dark:from-indigo-900/10">

            <div className="relative z-10 space-y-2 mt-4">
              <h2 className="text-5xl font-black tracking-tight mb-4">
                <span className={`inline-block ${isLogin ? 'animate-modern-shine' : 'text-gray-900 dark:text-white'}`}>
                  {isLogin ? "Welcome Back" : "Create Account"}
                </span>
              </h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium text-base">
                {isLogin
                  ? "Login to manage your references and data"
                  : "Join our platform for managing data and reference with ease"}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-8 pb-10 pt-2 space-y-6">
            {error && (
              <div className={`p-4 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-4 duration-300 border ${error.includes("successful")
                ? "bg-green-50/50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
                : "bg-red-50/50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
                }`}>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${error.includes("successful") || error.includes("activated") ? "bg-green-500" : "bg-red-500"}`}></div>
                    <span className="flex-1">{error}</span>
                  </div>
                  {isLogin && isActivationError && !resendStatus.success && (
                    <button
                      type="button"
                      onClick={handleResendActivation}
                      disabled={resendStatus.loading}
                      className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50 text-left pl-3.5"
                    >
                      {resendStatus.loading ? "Sending..." : "Resend Activation Link"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {resendStatus.message && (
              <div className={`p-4 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-4 duration-300 border ${resendStatus.success
                ? "bg-green-50/50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
                : "bg-red-50/50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
                }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${resendStatus.success ? "bg-green-500" : "bg-red-500"}`}></div>
                  {resendStatus.message}
                </div>
              </div>
            )}

            <div className="space-y-5">
              <InputField
                label="Email Address"
                type="email"
                icon={<Mail className="w-5 h-5" />}
                placeholder={allowedDomains.length > 0 ? `e.g. name@${allowedDomains[0]}` : "name@csir.res.in"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <InputField
                label="Password"
                type="password"
                icon={<Lock className="w-5 h-5" />}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              {!isLogin && (
                <InputField
                  label="Confirm Password"
                  type="password"
                  icon={<Lock className="w-5 h-5" />}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              )}

              {!isLogin && (
                <InputField
                  label="Mobile Number"
                  type="text"
                  icon={<svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>}
                  placeholder="e.g. 9876543210 (10 digits)"
                  value={mobileNo}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 10) {
                      setMobileNo(value);
                    }
                  }}
                  maxLength={10}
                />
              )}
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                type="submit"
                disabled={isLoading}
                loading={isLoading}
                fullWidth
                size="lg"
                className="shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all duration-300"
                icon={!isLoading && (isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />)}
              >
                {isLoading ? (isLogin ? 'Signing In...' : 'Creating Account...') : (isLogin ? 'Sign In' : 'Create Account')}
              </Button>
            </div>

            <div className="text-center space-y-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100 dark:border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-gray-800 px-2 text-gray-400 font-medium">Or</span>
                </div>
              </div>

              {isLogin && (
                <div>
                  <ParichayOAuth
                    onError={(error) => setError(error)}
                    onLoginStart={() => setIsLoading(true)}
                  />
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="group flex items-center justify-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  {isLogin
                    ? <span>Don't have an account? <span className="text-indigo-600 dark:text-indigo-400 underline decoration-2 decoration-transparent group-hover:decoration-indigo-600/30 transition-all">Create one</span></span>
                    : <span>Already have an account? <span className="text-indigo-600 dark:text-indigo-400 underline decoration-2 decoration-transparent group-hover:decoration-indigo-600/30 transition-all">Sign in</span></span>}
                </button>

                {isLogin && (
                  <button
                    type="button"
                    onClick={() => navigate("/forgotPassword")}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors font-medium"
                  >
                    Forgot your password?
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Footer Credit */}
        <p className="text-center mt-8 text-xs text-gray-400 dark:text-gray-500 font-medium">
          © {new Date().getFullYear()} CSIR Reference Management
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
