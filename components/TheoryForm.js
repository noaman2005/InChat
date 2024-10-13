import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { db, auth } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import Layout from './Layout';

const TheoryForm = () => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [media, setMedia] = useState(null);
    const [mediaPreview, setMediaPreview] = useState(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [loading, setLoading] = useState(false); // For loading state
    const [isPreviewVisible, setIsPreviewVisible] = useState(false); // For controlling preview visibility

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setMedia(file);
        setMediaPreview(URL.createObjectURL(file)); // Generate a preview URL
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); // Start loading

        const formData = new FormData();
        formData.append('file', media);

        try {
            // Step 1: Upload file to S3 via API route
            const { data } = await axios.post('/api/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const mediaUrl = data.links[0];

            // Step 2: Save theory data in Firebase
            const user = auth.currentUser;

            if (!user) {
                console.error("User is not authenticated");
                return;
            }

            await addDoc(collection(db, 'theories'), {
                title,
                description,
                mediaUrl,
                userId: user.uid,
                createdAt: new Date(),
            });

            // Reset form fields after submission
            setTitle('');
            setDescription('');
            setMedia(null);
            setMediaPreview(null); // Clear the preview after submission

            // Trigger success message and animation
            setShowSuccess(true);

            // Hide the success message after 3 seconds
            setTimeout(() => {
                setShowSuccess(false);
            }, 3000);
        } catch (error) {
            console.error("Error uploading image or submitting theory:", error);
        } finally {
            setLoading(false); // End loading
        }
    };

    // Update preview visibility based on input
    useEffect(() => {
        setIsPreviewVisible(title !== '' || description !== '' || media !== null);
    }, [title, description, media]);

    return (
        <Layout>
            <header className="p-4 flex items-center justify-center m-2">
                <h1 className="text-2xl font-bold text-white">Submit your Theory</h1>
            </header>
            <hr className="border-gray-300 w-full" />

            <div className="flex justify-center items-start h-auto space-x-8"> {/* Adjusted spacing */}
                {/* Form Section */}
                <div className="flex-1 max-w-lg p-4">
                    <main className="flex-1 p-2 bg-gray-800 rounded-lg shadow-lg">
                        <div className="flex flex-col">
                            <form onSubmit={handleSubmit} className="flex flex-col p-4 w-full">
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="title">Title</label>
                                    <input
                                        id="title"
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full p-2 border border-gray-100 rounded-lg focus:outline-none focus:ring focus:ring-blue-500"
                                        placeholder="Enter the title of your theory"
                                        required
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="description">Description</label>
                                    <textarea
                                        id="description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-blue-500"
                                        placeholder="Describe your theory..."
                                        rows="4"
                                        required
                                    />
                                </div>

                                {/* Media upload section */}
                                <div className="mb-6 relative group">
                                    <input
                                        id="media"
                                        type="file"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-600 bg-gray-800 rounded-lg p-6 transition-all duration-300 ease-in-out group-hover:bg-gray-700">
                                        <svg className="w-10 h-10 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 16l5.586-5.586a2 2 0 012.828 0L21 21M14 7h.01M7 7h.01M7 14h.01M14 14h.01M7 3h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z"></path>
                                        </svg>
                                        <span className="text-sm font-semibold text-gray-300">Upload Media</span>
                                        <p className="text-sm text-gray-500 mt-1">Choose a file or drag and drop here</p>
                                    </div>
                                </div>

                                <button type="submit" className="w-full py-2 mt-4 bg-blue-300 text-gray-700 font-bold rounded-lg hover:bg-blue-700 transition duration-300 transform hover:scale-105">
                                    {loading ? (
                                        <span className="flex items-center justify-center">
                                            <svg className="animate-spin h-5 w-5 mr-3 text-gray-700" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12c0 4.418 3.582 8 8 8s8-3.582 8-8H4z"></path>
                                            </svg>
                                            Uploading...
                                        </span>
                                    ) : (
                                        "Submit Theory"
                                    )}
                                </button>
                            </form>

                            {/* Success message with Tailwind animation */}
                            {showSuccess && (
                                <div className={`mt-4 p-4 bg-green-500 text-white text-center rounded-lg transition-opacity duration-500 ease-in-out ${showSuccess ? 'opacity-100' : 'opacity-0'}`}>
                                    🎉 Your theory has been successfully submitted!
                                </div>
                            )}
                        </div>
                    </main>
                </div>

                {/* Post Preview Section */}
                {isPreviewVisible && (
                    <div className="flex-1 max-w-md p-4 transition-opacity duration-500 ease-in-out">
                        <div className="p-4 bg-gray-700 rounded-lg shadow-lg">
                            <h2 className="text-xl font-bold text-white">Preview</h2>

                            {/* Title Header */}
                            <h3 className="text-lg font-semibold text-gray-300 mt-2">Title:</h3>
                            <p className="text-gray-200 animate-pulse">{title || "Title Preview"}</p>

                            {/* Description Header */}
                            <h3 className="text-lg font-semibold text-gray-300 mt-2">Description:</h3>
                            <p className="text-gray-200 animate-pulse">{description || "Description Preview..."}</p>

                            {/* Image Header */}
                            <h3 className="text-lg font-semibold text-gray-300 mt-2">Image Preview:</h3>
                            {mediaPreview ? (
                                <img
                                    src={mediaPreview}
                                    alt="Post Preview"
                                    className="w-full h-64 object-cover rounded-lg mt-2"
                                />
                            ) : (
                                <p className="text-gray-500">No image uploaded yet.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default TheoryForm;
