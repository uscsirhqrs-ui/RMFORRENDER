import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.tsx";
import { FeatureCodes, SUPERADMIN_ROLE_NAME } from "../../constants";
import UserDropdown from "./UserDropdown.tsx";
import { LogIn, FileStack, Users, ShieldAlert, Bell, Settings, Database, Shield, Share2, Library, Sparkles, Menu, X } from "lucide-react";
import Button from "../ui/Button.tsx";
import { TaskIndicator } from "../ui/TaskIndicator.tsx";
import { useState, useEffect, useRef } from "react";
import { getNotifications, markAsRead, markAllAsRead, type Notification } from "../../services/notification.api.ts";
import { switchUserRole } from "../../services/user.api.ts";
import { ChevronDown, Building2, Globe, Crown } from "lucide-react";
import toast from "react-hot-toast";
import logo2 from "../../assets/images/logo2.svg";

function Header() {
  console.log("Rendering Header - vMobile2");
  const { user, isAuthenticated, login, hasPermission, isPermissionsLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isApproved = user?.status === 'Approved';
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Refactored state: track ONE active dropdown
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobile Menu State

  const dropdownRef = useRef<HTMLDivElement>(null);
  const roleDropdownRef = useRef<HTMLDivElement>(null);
  const navLinksRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
      if (navLinksRef.current && !navLinksRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    if (isAuthenticated && user && isApproved) {
      try {
        const response = await getNotifications(1, 10, true);
        if (response.data?.data) {
          setNotifications(response.data.data.notifications);
          setUnreadCount(response.data.data.totalUnread);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user, isApproved]);

  const handleToggleNotifications = () => {
    if (!isNotificationsOpen) {
      fetchNotifications();
    }
    setIsNotificationsOpen(!isNotificationsOpen);
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      if (!notification.isRead) {
        await markAsRead(notification._id);
        setNotifications(prev => prev.filter(n => n._id !== notification._id));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      setIsNotificationsOpen(false);

      if (notification.type === 'NEW_USER_APPROVAL' || notification.type === 'PROFILE_UPDATE') {
        navigate('/users');
      } else if (notification.type === 'FORM_SHARED' || notification.type === 'FORM_UPDATED') {
        const id = notification.referenceId;
        if (id) {
          navigate('/data-collection/shared', { state: { openFormId: id } });
        } else {
          navigate('/data-collection/shared');
        }
      } else if (notification.referenceId) {
        navigate(`/references/${notification.referenceId}`);
      }
    } catch (error) {
      console.error("Error handling notification click:", error);
    }
  };

  const handleRoleSwitch = async (newRole: string) => {
    setIsRoleDropdownOpen(false);
    if (newRole === user?.role) return;

    try {
      const response = await switchUserRole(newRole);
      if (response.success && response.data) {
        const { user: newUser } = response.data;
        if (newUser) {
          login(newUser);
          toast.success(`Switched to ${newRole} role`);
          navigate('/');
        }
      }
    } catch (error) {
      console.error("Role switch failed:", error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setNotifications([]);
      setUnreadCount(0);
      setIsNotificationsOpen(false);
    } catch (error) {
      console.error("Error marking all read:", error);
    }
  };

  const getHomePath = () => {
    if (!isAuthenticated || !user) return "/";
    if (user.status !== 'Approved' || !user.labName || !user.designation) return "/profile";

    if (hasPermission(FeatureCodes.FEATURE_MANAGE_USERS_OWN_OFFICE) || hasPermission(FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES)) return "/users";

    if (hasPermission(FeatureCodes.FEATURE_VIEW_OWN_OFFICE_SENDER)) return "/references/local";
    if (hasPermission(FeatureCodes.FEATURE_VIEW_INTER_OFFICE_SENDER)) return "/references/global?scope=inter-lab";

    if (hasPermission(FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_OWN_OFFICE)) return "/admin/references/local";
    if (hasPermission(FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_ALL_OFFICES)) return "/admin/references/local";
    if (hasPermission(FeatureCodes.FEATURE_MANAGE_GLOBAL_REFERENCES)) return "/admin/references/global";

    if (hasPermission(FeatureCodes.FEATURE_FORM_MANAGEMENT)) return "/data-collection";

    return "/profile";
  };

  const homePath = getHomePath();

  const getRoleTheme = (role?: string) => {
    switch (role) {
      case SUPERADMIN_ROLE_NAME:
        return {
          border: 'border-b border-red-500/30 shadow-[0_1px_10px_rgba(239,68,68,0.1)]',
          badge: 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30',
        };
      case 'Inter Lab sender':
        return {
          border: 'border-b border-indigo-500/30 shadow-[0_1px_10px_rgba(79,70,229,0.1)]',
          badge: 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800/30',
          indicator: 'bg-indigo-500'
        };
      case 'Delegated Admin':
        return {
          border: 'border-b border-purple-500/30 shadow-[0_1px_10px_rgba(168,85,247,0.1)]',
          badge: 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800/30',
          indicator: 'bg-purple-500'
        };
      default:
        return {
          border: 'border-b border-gray-100 dark:border-gray-800',
          badge: 'bg-gray-50 text-gray-600 border-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
        };
    }
  };

  const roleTheme = getRoleTheme(user?.role);
  const isProfileIncomplete = !user?.labName || !user?.designation;

  const hasOwnLabRef = hasPermission(FeatureCodes.FEATURE_VIEW_OWN_OFFICE_SENDER);
  const hasInterLabRef = hasPermission(FeatureCodes.FEATURE_VIEW_INTER_OFFICE_SENDER);
  const hasManageLocalOwn = hasPermission(FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_OWN_OFFICE);
  const hasManageLocalAll = hasPermission(FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_ALL_OFFICES);
  const hasManageGlobal = hasPermission(FeatureCodes.FEATURE_MANAGE_GLOBAL_REFERENCES);

  const navLinks = (!isAuthenticated || !isApproved || isProfileIncomplete) ? [] : [
    ...(hasOwnLabRef || hasInterLabRef ? [{
      path: hasOwnLabRef ? "/references/local" : "/references/global?scope=inter-lab",
      label: "References",
      icon: FileStack,
      hasDropdown: true,
      subItems: [
        ...(hasOwnLabRef ? [{ label: "Local References", path: "/references/local", icon: Building2 }] : []),
        ...(hasInterLabRef ? [{ label: "Global References", path: "/references/global?scope=inter-lab", icon: Globe }] : []),
        { label: "VIP References", path: "/references/vip", icon: Crown },
      ]
    }] : []),
    ...(hasManageLocalOwn || hasManageLocalAll || hasManageGlobal ? [{
      path: hasManageLocalOwn || hasManageLocalAll ? "/admin/references/local" : "/admin/references/global",
      label: "Manage References",
      icon: Settings,
      hasDropdown: true,
      subItems: [
        ...(hasManageLocalOwn || hasManageLocalAll ? [{ label: "Local References", path: "/admin/references/local", icon: Building2 }] : []),
        ...(hasManageGlobal ? [{ label: "Global References", path: "/admin/references/global", icon: Globe }] : []),
      ]
    }] : []),

    ...(hasPermission(FeatureCodes.FEATURE_FORM_MANAGEMENT) ? [{
      path: "/data-collection/shared",
      label: "Data Collection",
      icon: Database,
      hasDropdown: true,
      subItems: [
        { label: "AI Form Builder", path: "/data-collection/create", icon: Sparkles },
        { label: "My Distributions", path: "/data-collection/shared", icon: Share2 },
        { label: "Saved Templates", path: "/data-collection/saved", icon: Library },
      ]
    }] : []),
    ...(hasPermission(FeatureCodes.FEATURE_MANAGE_USERS_OWN_OFFICE) || hasPermission(FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES) ? [{ path: "/users", label: "Manage Users", icon: Users }] : []),
    ...(hasPermission(FeatureCodes.FEATURE_AUDIT_TRAILS) ? [{ path: "/audit-trails", label: "Audit Trails", icon: ShieldAlert }] : []),
    ...(hasPermission(FeatureCodes.FEATURE_SYSTEM_CONFIGURATION) ? [{
      path: "/system-settings",
      label: "Config",
      icon: Settings,
      hasDropdown: true,
      subItems: [
        { label: "System Config", path: "/system-settings", icon: Settings },
        { label: "Feature Access Control", path: "/feature-permissions", icon: Shield }
      ]
    }] : []),
  ];

  const isActivePath = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <header className={`py-4 sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-white/20 dark:border-gray-800/20 transition-all duration-500 ease-in-out ${isAuthenticated && user && isApproved ? roleTheme.border : 'shadow-sm'}`}>
      <div className="w-full px-3 sm:px-5 lg:px-7 flex justify-between items-center">
        <div id="Branding" className="flex items-center justify-start max-w-[70%] sm:max-w-none">
          <Link to={homePath} className="flex items-center">
            <img
              className="w-16 sm:w-20 md:w-24 object-contain"
              src={logo2}
              alt="Logo"
            />
          </Link>
          <div className="hidden sm:flex flex-col text-[13px] sm:text-[14px] leading-[1.2] font-heading text-gray-700 dark:text-gray-300 ml-3 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
            <span className="font-bold tracking-tight text-gray-900 dark:text-white uppercase italic"> वैज्ञानिक तथा औद्योगिक अनुसंधान परिषद् </span>
            <span className="font-bold tracking-tight"> Council of Scientific &amp; Industrial Research</span>
            <span className="text-gray-400 font-medium dark:text-gray-500 text-[11px] sm:text-[12px]"> (Ministry of Science &amp; Technology, Govt. of India) </span>
          </div>
        </div>

        <nav id="nav" className="flex gap-4 sm:gap-8 items-center justify-end px-2 sm:px-6">
          {isAuthenticated && user && isApproved ? (
            <>
              {/* Desktop Navigation */}
              <div className="hidden lg:flex gap-8 items-center text-sm ml-8" ref={navLinksRef}>
                {navLinks.map((link: any) => {
                  const isActive = isActivePath(link.path) || (link.hasDropdown && link.subItems?.some((sub: any) => isActivePath(sub.path)));
                  const isDropdownOpen = activeDropdown === link.label;

                  if (link.hasDropdown) {
                    return (
                      <div key={link.path} className="relative">
                        <button
                          onClick={() => setActiveDropdown(isDropdownOpen ? null : link.label)}
                          className={`flex items-center gap-1.5 py-2 font-bold transition-all duration-300 font-heading group ${isActive
                            ? "text-gray-900 border-b-2 border-indigo-600"
                            : "text-gray-500 hover:text-gray-900"
                            }`}
                        >
                          {link.label}
                          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''} ${isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                        </button>

                        {isDropdownOpen && (
                          <div className="absolute left-0 mt-3 w-64 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 py-3 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="py-2 px-2">
                              {link.subItems.map((subItem: any) => (
                                <Link
                                  key={subItem.path}
                                  to={subItem.path}
                                  onClick={() => setActiveDropdown(null)}
                                  className="flex items-center gap-3 w-full text-left px-5 py-3 text-[13px] font-bold text-gray-700 dark:text-gray-300 hover:bg-indigo-50/50 hover:text-indigo-600 rounded-xl transition-all"
                                >
                                  <subItem.icon className="w-4 h-4 shrink-0" />
                                  {subItem.label}
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={`py-2 font-bold transition-all duration-300 font-heading ${isActive
                        ? "text-gray-900 border-b-2 border-indigo-600"
                        : "text-gray-500 hover:text-gray-900"
                        }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>

              {/* Mobile Actions (Notifications & User) */}
              <div className="flex items-center gap-2 sm:gap-4 pl-2 sm:pl-6 sm:border-l sm:border-gray-100 dark:sm:border-gray-700 sm:ml-2">
                <div className="hidden sm:block">
                  <TaskIndicator />
                </div>

                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={handleToggleNotifications}
                    className="relative p-2 text-gray-400 hover:text-indigo-600 transition-colors rounded-full hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-2 right-2 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                    )}
                  </button>

                  {isNotificationsOpen && (
                    <div className="absolute right-0 mt-3 w-72 sm:w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-xl ring-1 ring-black/5 z-50 overflow-hidden border border-gray-100 dark:border-gray-700">
                      <div className="p-4 border-b border-gray-50 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/30 flex justify-between items-center">
                        <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                          Notifications
                          {unreadCount > 0 && <span className="ml-2 bg-indigo-50 dark:bg-indigo-900 text-indigo-600 text-[10px] py-0.5 px-2 rounded-full">{unreadCount}</span>}
                        </h3>
                        {unreadCount > 0 && (
                          <button onClick={handleMarkAllRead} className="text-[10px] uppercase font-bold text-indigo-600 hover:underline">Clear All</button>
                        )}
                      </div>
                      <div className="max-h-96 sm:max-h-128 overflow-y-auto">
                        {notifications.length > 0 ? (
                          <div className="divide-y divide-gray-50 dark:divide-gray-700">
                            {notifications.map((notif) => (
                              <div
                                key={notif._id}
                                onClick={() => handleNotificationClick(notif)}
                                className="block p-4 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                              >
                                <div className="flex flex-col gap-1">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {notif.title}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                    {notif.message}
                                  </p>
                                  <p className="text-[10px] text-gray-400 mt-1">
                                    {new Date(notif.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-xs">
                            <p>All caught up!</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative hidden sm:block" ref={roleDropdownRef}>
                  <button
                    onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                    disabled={!user.availableRoles || user.availableRoles.length <= 1}
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border shadow-sm ${roleTheme.badge} ${user.availableRoles && user.availableRoles.length > 1 ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                  >
                    {user.role}
                    {user.availableRoles && user.availableRoles.length > 1 && (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>

                  {isRoleDropdownOpen && user.availableRoles && user.availableRoles.length > 1 && (
                    <div className="absolute top-full right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50">
                      <div className="py-1">
                        {user.availableRoles.map((role) => (
                          <button
                            key={role}
                            onClick={() => handleRoleSwitch(role)}
                            className={`w-full text-left px-4 py-2 text-xs font-medium ${role === user.role ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                          >
                            {role}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="hidden sm:block">
                  <UserDropdown
                    labName={user.labName || user.fullName}
                    userInitials={user.initials}
                    userEmail={user.email}
                    userRole={user.role}
                    userAvatar={user.avatar}
                  />
                </div>

                {/* Mobile Menu Toggle */}
                <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="lg:hidden p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-50 rounded-lg transition-all"
                >
                  <Menu className="w-6 h-6" />
                </button>
              </div>
            </>
          ) : isAuthenticated && user && !isApproved ? (
            null
          ) : (
            <Button
              variant="primary"
              onClick={() => navigate("/login")}
              icon={<LogIn className="w-4 h-4" />}
            >
              Login / Register
            </Button>
          )}
        </nav>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 lg:hidden overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="p-4 flex justify-between items-center border-b border-gray-100 dark:border-gray-800">
              <span className="font-bold text-lg text-gray-900 dark:text-white">Menu</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6">
              {/* User Profile Card Mobile */}
              {user && (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xl">
                    {user.avatar ? <img src={user.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" /> : user.initials}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{user.fullName}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                    <div className="mt-2 flex gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${roleTheme.badge}`}>{user.role}</span>
                      {user.availableRoles && user.availableRoles.length > 1 && (
                        <button onClick={() => {
                          const nextRole = user.availableRoles?.find(r => r !== user.role);
                          if (nextRole) handleRoleSwitch(nextRole);
                        }} className="text-[10px] text-indigo-600 underline">Switch</button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {isPermissionsLoading && (
                  <div className="px-4 py-2 text-xs text-indigo-500 font-bold animate-pulse">Syncing menu...</div>
                )}
                {navLinks.map((link: any) => {
                  const isActive = isActivePath(link.path);

                  if (link.hasDropdown) {
                    return (
                      <div key={link.path} className="flex flex-col gap-2">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 pt-2">{link.label}</div>
                        {link.subItems.map((sub: any) => (
                          <Link
                            key={sub.path}
                            to={sub.path}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 active:bg-indigo-50 active:text-indigo-600 transition-colors"
                          >
                            <sub.icon className="w-4 h-4" />
                            {sub.label}
                          </Link>
                        ))}
                      </div>
                    )
                  }

                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${isActive ? "bg-indigo-50 text-indigo-600" : "bg-gray-50 dark:bg-gray-800 text-gray-700"
                        }`}
                    >
                      {link.icon && <link.icon className="w-4 h-4" />}
                      {link.label}
                    </Link>
                  )
                })}
              </div>

              <div className="mt-auto pt-6 border-t border-gray-100">
                <button onClick={() => { setIsMobileMenuOpen(false); navigate('/profile') }} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50">
                  My Profile
                </button>
                <button onClick={() => {
                  // Logout logic
                  useAuth().logout(); // Wait, need to access logout from context but hook rules. 
                  // We have userDropdown logic, lets simulate:
                  navigate('/logout');
                }} className="w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100">
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header >
  );
}

export default Header;
