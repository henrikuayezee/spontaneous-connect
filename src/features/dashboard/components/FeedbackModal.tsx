import React, { useState } from 'react';
import { Star, X, MessageSquare, ThumbsUp } from 'lucide-react';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (rating: number, notes: string) => Promise<void>;
    partnerName: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    partnerName,
}) => {
    const [rating, setRating] = useState<number>(0);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) return;

        setIsSubmitting(true);
        try {
            await onSubmit(rating, notes);
            onClose();
        } catch (error) {
            console.error('Failed to submit feedback', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">How was your call?</h2>
                            <p className="text-sm text-gray-500">Help us improve your connection with {partnerName}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Rating */}
                        <div className="flex justify-center space-x-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    className={`p-2 rounded-full transition-all duration-200 hover:scale-110 focus:outline-none ${rating >= star ? 'text-yellow-400' : 'text-gray-200'
                                        }`}
                                >
                                    <Star
                                        className={`w-8 h-8 ${rating >= star ? 'fill-current' : ''}`}
                                    />
                                </button>
                            ))}
                        </div>
                        <div className="text-center text-sm font-medium text-gray-600 h-5">
                            {rating === 1 && "Not great"}
                            {rating === 2 && "Could be better"}
                            {rating === 3 && "It was okay"}
                            {rating === 4 && "Good call!"}
                            {rating === 5 && "Awesome!"}
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Any notes? (Optional)
                            </label>
                            <div className="relative">
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="We talked about..."
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-24 text-sm"
                                />
                                <MessageSquare className="absolute right-3 bottom-3 w-4 h-4 text-gray-400" />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={rating === 0 || isSubmitting}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95 flex items-center justify-center space-x-2"
                        >
                            {isSubmitting ? (
                                <span>Saving...</span>
                            ) : (
                                <>
                                    <ThumbsUp className="w-4 h-4" />
                                    <span>Submit Feedback</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
