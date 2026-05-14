import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Chat } from '@types';

interface ChatState {
  items: Chat[];
  loading: boolean;
  error: string | null;
}

const initialState: ChatState = {
  items: [],
  loading: false,
  error: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setChats(state, action: PayloadAction<Chat[]>) {
      state.items = action.payload;
      state.error = null;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
});

export const { setChats, setLoading, setError } = chatSlice.actions;
export default chatSlice.reducer;
