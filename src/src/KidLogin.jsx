import React, { useState } from 'react';
import { supabase } from './supabaseClient';

export default function KidLogin({ onLoginSuccess }) {
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('🐱'); // Default avatar
  const [loading, setLoading] = useState(false);

  const avatars = ['🐱', '🐶', '🦊', '🦁', '🐸', '🦄', '🤖', '🚀'];

  const handleEnterApp = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) return alert("Please type a nickname!");

    setLoading(true);

    // This creates a secure, anonymous account instantly without any email/password!
    const { data, error } = await supabase.auth.signInAnonymously({
      options: {
        // We can pass the custom nickname and avatar directly into their profile data
        data: { 
          nickname: nickname, 
          avatar: avatar 
        }
      }
    });

    setLoading(false);

    if (error) {
      alert(`Oops, something went wrong: ${error.message}`);
    } else {
      // Pass the user details upward to the rest of the application
      onLoginSuccess(data.user);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', textAlign: 'center', padding: '30px', border: '3px solid #FFD166', borderRadius: '20px', backgroundColor: '#FFFDF6', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#FF6B6B', fontSize: '28px' }}>Welcome to the App!</h2>
      <p style={{ color: '#4EA8DE' }}>Choose an avatar and type your secret nickname:</p>
      
      {/* Avatar Picker */}
      <div style={{ fontSize: '35px', margin: '20px 0', display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {avatars.map((av) => (
          <button 
            key={av} 
            type="button"
            onClick={() => setAvatar(av)} 
            style={{ background: avatar === av ? '#4EA8DE' : 'transparent', border: 'none', borderRadius: '50%', cursor: 'pointer', padding: '5px', transition: '0.2s' }}
          >
            {av}
          </button>
        ))}
      </div>

      <form onSubmit={handleEnterApp}>
        <input 
          type="text" 
          value={nickname} 
          onChange={(e) => setNickname(e.target.value)} 
          placeholder="Type your nickname..." 
          maxLength={15}
          style={{ width: '80%', padding: '12px', fontSize: '18px', borderRadius: '10px', border: '2px solid #4EA8DE', textAlign: 'center', marginBottom: '20px' }}
        />
        <br />
        <button 
          type="submit" 
          disabled={loading}
          style={{ background: '#06D6A0', color: 'white', border: 'none', padding: '15px 40px', fontSize: '20px', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
        >
          {loading ? 'Entering...' : "Let's Play! 🚀"}
        </button>
      </form>
    </div>
  );
}
