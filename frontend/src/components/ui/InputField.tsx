/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

// --- Types ---

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
}

const InputField: React.FC<InputFieldProps> = ({ id, label, icon, className = "", ...props }) => (
  <div className="mb-4">
    <label htmlFor={id} className="block text-[10px] font-bold text-gray-400 tracking-wider mb-1.5 ml-0.5 font-heading">
      {label} {props.required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-300">
        {icon}
      </div>
      <input
        id={id}
        {...props}
        className={`w-full pl-11 pr-4 py-2 border border-gray-100 rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/20 transition-all duration-200 text-sm placeholder:text-gray-300 text-gray-700 ${className}`}
      />
    </div>
  </div>
);

export default InputField