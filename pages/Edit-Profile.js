import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import Navbar from '../components/Navbar';

export default function EditProfile() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [photoURL, setPhotoURL] = useState('');
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (!user) {
                router.push('/login');
            } else {
                fetchUserData(user.uid);
            }
        });
        return () => unsubscribe();
    }, [router]);

    const fetchUserData = async (userId) => {
        try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                setUser(userData);
                setDisplayName(userData.displayName || '');
                setBio(userData.bio || '');
                setPhotoURL(userData.photoURL || '/default-avatar.png');
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setFile(e.target.files[0]);
            setPhotoURL(URL.createObjectURL(e.target.files[0]));
        }
    };

    const uploadFileToStorage = async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Error uploading file');
        }

        const data = await response.json();
        return data.links[0]; // Assuming you're returning an array of links
    };

    const handleSaveChanges = async () => {
        if (!user) return;

        setLoading(true);
        const userId = auth.currentUser.uid;
        const userRef = doc(db, 'users', userId);
        const updatedData = {
            displayName,
            bio
        };

        try {
            if (file) {
                const imageUrl = await uploadFileToStorage(file);
                updatedData.photoURL = imageUrl;
            }

            await updateDoc(userRef, updatedData);
            alert("Profile updated successfully!");
            router.push(`/Dashboard`);
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("An error occurred while updating the profile. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <Navbar />
            <div className="max-w-xl mx-auto p-4 bg-white shadow-md rounded-lg">
                <h2 className="text-2xl font-semibold mb-4">Edit Profile</h2>
                <div className="flex flex-col items-center space-y-4">
                    {/* Profile Picture */}
                    <img
                        src={photoURL}
                        alt="Profile Picture"
                        className="w-24 h-24 rounded-full object-cover mb-2"
                        referrerPolicy="no-referrer"
                    />
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="border rounded-md p-2"
                    />

                    {/* Display Name */}
                    <div className="w-full">
                        <label className="block text-gray-700 mb-2">Display Name</label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full border p-2 rounded-md focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    {/* Bio */}
                    <div className="w-full">
                        <label className="block text-gray-700 mb-2">Bio</label>
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            className="w-full border p-2 rounded-md focus:outline-none focus:border-blue-500"
                            rows="4"
                        ></textarea>
                    </div>

                    {/* Save Button */}
                    <button
                        onClick={handleSaveChanges}
                        className="bg-blue-500 text-white font-semibold px-4 py-2 rounded-md hover:bg-blue-600 transition duration-200"
                        disabled={loading}
                    >
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </Layout>
    );
}
