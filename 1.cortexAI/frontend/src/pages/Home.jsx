import React from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../../utils/firebase';
import api from "../../utils/axios";
import { FcGoogle } from 'react-icons/fc';

function Home() {
    const handleLogin = async (token) => {
    try{
      const {data}= await api.post("/api/auth/login",{token});
      console.log(data);
    } catch(error){
      console.log(error);
    }
  }


  const googleLogin =async () => {
      const data=await signInWithPopup(auth, googleProvider);
      const token=await data.user.getIdToken();
      console.log(token);
      await handleLogin(token);
      console.log(data);
  }
  return (
    <div className='h-screen flex bg-[#0a0d14] text-slate-100 overflow-hidden'>
      <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md transition-all'>
        <div className='w-[350px] bg-[#121824] border border-slate-800/80 rounded-2xl p-7 flex flex-col gap-6 shadow-2xl shadow-indigo-950/20'>
          <div className='flex flex-col gap-1.5'>
            <h2 className='text-[18px] font-semibold text-white tracking-tight'>
              Welcome to CortexAI
            </h2>
            <p className='text-[13px] text-slate-400 leading-relaxed'>
              Please login to continue using the app.
            </p>
          </div>

          <button
            className='w-full flex items-center justify-center gap-3 py-[12px] rounded-xl text-sm font-semibold text-slate-900 bg-white hover:bg-slate-100 active:scale-[0.98] transition-all duration-200 cursor-pointer shadow-md shadow-black/20'
            onClick={googleLogin}
          >
            <FcGoogle size={18} />
            Continue With Google
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home