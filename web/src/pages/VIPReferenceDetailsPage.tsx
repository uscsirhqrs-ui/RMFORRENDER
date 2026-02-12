/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-24
 */

import { useNavigate } from "react-router-dom";
import { ArrowLeft, Crown } from "lucide-react";

function VIPReferenceDetailsPage() {
    const navigate = useNavigate();

    return (
        <div className="container mx-auto p-8 text-center">
            <button
                onClick={() => {
                    navigate('/references/vip');
                }}
                className="flex items-center text-gray-600 hover:text-gray-900 mb-8 mx-auto"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to VIP References
            </button>

            <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm border border-orange-100 p-10">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Crown className="w-8 h-8 text-orange-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">VIP Reference Details</h1>
                <p className="text-gray-500 mb-6">
                    Detailed view for VIP references is currently under development.
                </p>
                <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600 border border-gray-200">
                    Feature coming in Phase 2
                </div>
            </div>
        </div>
    );
}

export default VIPReferenceDetailsPage;
