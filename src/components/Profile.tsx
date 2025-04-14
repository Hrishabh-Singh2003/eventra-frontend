import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Star, User, LogOut, Image, X } from 'lucide-react';
import { getAuth, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  participated?: boolean;  // Track if user actually participated
  contribution?: number;   // Track user's contribution/engagement level (0-10)
}

interface UserData {
  name: string;
  email: string;
  id: string;
}

interface Review {
  id: string;
  eventTitle: string;
  rating: number;
  comment: string;
  imageUrl?: string;
  date: string;
}

interface UserStats {
  eventsAttended: number;
  totalContribution: number;
  averageRating: number;
  vibeScore: number;
}

const Profile = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');
  const [registeredEvents, setRegisteredEvents] = useState<Event[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeTab, setActiveTab] = useState('profile');
  const [userStats, setUserStats] = useState<UserStats>({
    eventsAttended: 0,
    totalContribution: 0,
    averageRating: 0,
    vibeScore: 0
  });
  const [user, setUser] = useState<UserData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newReview, setNewReview] = useState({
    eventTitle: '',
    rating: 0,
    comment: '',
    image: null as File | null
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const calculateVibeScore = (events: Event[], reviews: Review[]): UserStats => {
    const stats = {
      eventsAttended: 0,
      totalContribution: 0,
      averageRating: 0,
      vibeScore: 0
    };

    // Calculate events contribution
    events.forEach(event => {
      if (event.participated) {
        stats.eventsAttended++;
        stats.totalContribution += event.contribution || 0;
      }
    });

    // Calculate average rating from reviews
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    stats.averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

    // Calculate vibe score (max 100)
    // Formula: (30% from event attendance) + (40% from contributions) + (30% from ratings)
    const attendanceScore = Math.min(30, (stats.eventsAttended / 10) * 30); // Max 30 points, assumes 10 events is max
    const contributionScore = Math.min(40, (stats.totalContribution / (stats.eventsAttended * 10)) * 40); // Max 40 points
    const ratingScore = (stats.averageRating / 5) * 30; // Max 30 points

    stats.vibeScore = Math.round(attendanceScore + contributionScore + ratingScore);

    return stats;
  };

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      const nameFromEmail = user.email?.split('@')[0] || 'User';
      setUserName(nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1));
    }

    // Simulated data - replace with actual API calls
    const mockEvents = [
      {
        id: '1',
        title: 'Tech Conference 2024',
        date: '2024-05-15',
        time: '10:00 AM',
        participated: true,
        contribution: 8
      },
      {
        id: '2',
        title: 'Web Development Workshop',
        date: '2024-05-20',
        time: '2:00 PM',
        participated: true,
        contribution: 7
      }
    ];

    const mockReviews = [
      {
        id: '1',
        eventTitle: 'Tech Conference 2024',
        rating: 5,
        comment: 'Amazing event with great speakers!',
        date: '2024-05-15'
      }
    ];

    setRegisteredEvents(mockEvents);
    setReviews(mockReviews);
    setUserStats(calculateVibeScore(mockEvents, mockReviews));
  }, []);

  const handleLogout = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewReview(prev => ({ ...prev, image: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReview.eventTitle || !newReview.rating || !newReview.comment) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('eventTitle', newReview.eventTitle);
      formData.append('rating', newReview.rating.toString());
      formData.append('comment', newReview.comment);
      if (newReview.image) {
        formData.append('image', newReview.image);
      }

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/reviews', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to submit review');
      }

      const data = await response.json();
      
      // Create a new review object with the current date
      const newReviewObj: Review = {
        id: data.id,
        eventTitle: newReview.eventTitle,
        rating: newReview.rating,
        comment: newReview.comment,
        imageUrl: data.imageUrl,
        date: new Date().toLocaleDateString()
      };

      // Update reviews state immediately
      setReviews(prev => [newReviewObj, ...prev]);

      // Update user stats with +10 XP
      setUserStats(prev => ({
        ...prev,
        totalContribution: prev.totalContribution + 10,
        vibeScore: Math.min(100, prev.vibeScore + 10) // Cap at 100
      }));

      // Reset form
      setNewReview({
        eventTitle: '',
        rating: 0,
        comment: '',
        image: null
      });
      setPreviewUrl(null);
      setSuccess('Review submitted successfully! +10 XP earned!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    }
  };

  const removeImage = () => {
    setNewReview(prev => ({ ...prev, image: null }));
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-teal-500 to-blue-600 p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center">
                  <User className="w-10 h-10 text-teal-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">{userName}</h1>
                  <p className="text-teal-100">Student</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 bg-white text-teal-600 rounded-lg hover:bg-teal-50 transition-colors"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Logout
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'profile'
                    ? 'border-b-2 border-teal-500 text-teal-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveTab('events')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'events'
                    ? 'border-b-2 border-teal-500 text-teal-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Registered Events
              </button>
              <button
                onClick={() => setActiveTab('calendar')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'calendar'
                    ? 'border-b-2 border-teal-500 text-teal-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Calendar
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'reviews'
                    ? 'border-b-2 border-teal-500 text-teal-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Reviews
              </button>
            </nav>
          </div>

          {/* Content Sections */}
          <div className="p-6">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
                  <div className="space-y-2">
                    <p><span className="font-medium">Name:</span> {userName}</p>
                    <p><span className="font-medium">Email:</span> {getAuth().currentUser?.email}</p>
                    <p><span className="font-medium">Role:</span> Student</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h2 className="text-lg font-semibold mb-4">Vibe Stats</h2>
                  <div className="space-y-4">
                    <div className="relative pt-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-teal-600 bg-teal-200">
                            Vibe Score
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold inline-block text-teal-600">
                            {userStats.vibeScore}/100
                          </span>
                        </div>
                      </div>
                      <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-teal-200">
                        <div
                          style={{ width: `${userStats.vibeScore}%` }}
                          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-teal-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <p className="text-sm text-gray-500">Events Attended</p>
                        <p className="text-xl font-semibold text-teal-600">{userStats.eventsAttended}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <p className="text-sm text-gray-500">Avg Contribution</p>
                        <p className="text-xl font-semibold text-teal-600">
                          {userStats.eventsAttended ? Math.round((userStats.totalContribution / userStats.eventsAttended) * 10) / 10 : 0}/10
                        </p>
                      </div>
                      <div className="bg-white p-3 rounded-lg shadow-sm">
                        <p className="text-sm text-gray-500">Avg Rating</p>
                        <p className="text-xl font-semibold text-teal-600">{userStats.averageRating.toFixed(1)}/5</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'events' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold mb-4">Registered Events</h2>
                <div className="grid gap-4">
                  {registeredEvents.map((event) => (
                    <div key={event.id} className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium">{event.title}</h3>
                      <p className="text-sm text-gray-600">Date: {event.date}</p>
                      <p className="text-sm text-gray-600">Time: {event.time}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'calendar' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold mb-4">Event Calendar</h2>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <Calendar className="w-6 h-6 text-teal-600 mb-4" />
                  <div className="space-y-4">
                    {registeredEvents.map((event) => (
                      <div key={event.id} className="border-l-4 border-teal-500 pl-4">
                        <h3 className="font-medium">{event.title}</h3>
                        <p className="text-sm text-gray-600">{event.date} at {event.time}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold mb-4">Your Reviews</h2>
                
                {/* Success message */}
                {success && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <p className="text-green-600">{success}</p>
                  </div>
                )}

                {/* Error message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <p className="text-red-600">{error}</p>
                  </div>
                )}

                {/* Reviews List */}
                <div className="space-y-4">
                  {reviews.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-slate-500">No reviews yet. Share your experience!</p>
                    </div>
                  ) : (
                    reviews.map((review) => (
                      <div key={review.id} className="bg-slate-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium">{review.eventTitle}</h3>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-slate-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-slate-600 mb-2">{review.comment}</p>
                        {review.imageUrl && (
                          <img
                            src={review.imageUrl}
                            alt="Event"
                            className="w-full h-48 object-cover rounded-lg mb-2"
                          />
                        )}
                        <p className="text-sm text-slate-500">Posted on {review.date}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Review Form */}
                <form onSubmit={handleReviewSubmit} className="mt-8 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Event Title
                    </label>
                    <input
                      type="text"
                      value={newReview.eventTitle}
                      onChange={(e) => setNewReview(prev => ({ ...prev, eventTitle: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="Enter event title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Rating
                    </label>
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                          className="focus:outline-none"
                        >
                          <Star
                            className={`w-6 h-6 ${
                              star <= newReview.rating
                                ? 'text-yellow-400 fill-current'
                                : 'text-slate-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Review
                    </label>
                    <textarea
                      value={newReview.comment}
                      onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      rows={4}
                      placeholder="Share your experience..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Event Image
                    </label>
                    <div className="flex items-center space-x-4">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                      >
                        <Image className="w-5 h-5 mr-2 text-slate-500" />
                        Upload Image
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        accept="image/*"
                        className="hidden"
                      />
                      {previewUrl && (
                        <div className="relative">
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={removeImage}
                            className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full flex items-center justify-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    Submit Review
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;