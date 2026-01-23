/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import { useState, useRef, useEffect } from 'react';
import { useAuth } from "../../context/AuthContext.tsx";
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { LogOut, User, Settings, HelpCircle } from 'lucide-react';

interface UserDropdownProps {
  labName?: string;
  userInitials?: string;
  userEmail?: string;
  userRole?: string;
  userAvatar?: string;
}

function UserDropdown({ labName = 'User', userInitials = 'U', userEmail = 'user@example.com', userRole = 'User', userAvatar }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isDropdownItemActive = location.pathname === "/profile"; // Add other paths as needed

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = () => {
    setIsOpen(false);
    navigate("/logout", { replace: true });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Trigger Button */}
      <button
        onClick={toggleDropdown}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-bold transition-all focus:outline-none border shadow-sm ${isOpen || isDropdownItemActive
          ? "bg-indigo-600 text-white border-indigo-600 shadow-indigo-200"
          : "bg-white/50 backdrop-blur-md text-gray-700 border-gray-200/50 hover:bg-white hover:border-gray-300"
          }`}
      >
        {/* User Avatar */}
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold overflow-hidden ${(isOpen || isDropdownItemActive) ? 'bg-indigo-400' : 'bg-indigo-100 text-indigo-600'
          }`}>
          {userAvatar ? (
            <img src={userAvatar} alt={userInitials} className="w-full h-full object-cover" />
          ) : (
            userInitials
          )}
        </div>
        <span className="hidden sm:inline text-sm font-medium">{labName}</span>
        {/* Dropdown Arrow */}
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-56 lg:w-64 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 py-3 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* User Info */}
          <div className="px-5 py-3 border-b border-gray-50 dark:border-gray-700 bg-gray-50/30">
            <p className="text-sm font-bold text-gray-900 truncate" title={labName}>{labName}</p>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">{userRole}</p>
            <p className="text-xs text-gray-500 truncate" title={userEmail}>{userEmail}</p>
          </div>

          {/* Menu Items */}
          <div className="py-2 px-2">
            <Link
              to="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 w-full text-left px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-indigo-50/50 hover:text-indigo-600 rounded-xl transition-all"
            >
              <User className="w-4 h-4" /> Profile
            </Link>

            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 w-full text-left px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-indigo-50/50 hover:text-indigo-600 rounded-xl transition-all"
            >
              <Settings className="w-4 h-4" /> Settings
            </Link>

            <Link
              to="/help"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 w-full text-left px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-indigo-50/50 hover:text-indigo-600 rounded-xl transition-all"
            >
              <HelpCircle className="w-4 h-4" /> Help
            </Link>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-50 dark:border-gray-700 my-1 mx-4"></div>

          {/* Logout Button */}
          <div className="px-2">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full text-left px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all mb-1"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
      )}


    </div>
  );
}

export default UserDropdown;
