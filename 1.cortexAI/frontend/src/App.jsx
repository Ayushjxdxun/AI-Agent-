import React from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../utils/firebase';
import api from "../utils/axios";
import Home from './pages/Home';
import { useEffect } from 'react';
import getCurrentUser from './features/getCurrentUser';

function App() {
useEffect(() => {
  const getUser=async () => {
    await getCurrentUser();
  }
  getUser();
}, [])

  return (
    <>
    <Home/>
    </>
  )
}

export default App