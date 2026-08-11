import { createSlice } from '@reduxjs/toolkit';
const userSlice = createSlice({
  name: 'user',
  initialState: {
    userData: null,
  },
  reducers: {
    setUserData: (state, action) => {
      state.userData = action.payload;//now the value of thhe usestate is updated 
    }
    },
  });

  export const { setUserData } = userSlice.actions;
  export default userSlice.reducer;