import React from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../utils/firebase';
import api from "../utils/axios";
import Home from './pages/Home';

function App() {


  return (
    <>
    <Home/>
    </>
  )
}

export default App