import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Chat, User } from '@types';
import { getChats, searchChatEntities, createGroupChat } from '@services/modules/chat.service';

interface ChatState {
  items: Chat[];
  searchUsers: User[];
  searchChats: Chat[];
  loading: boolean;
  searchLoading: boolean;
  groupLoading: boolean;
  error: string | null;
}

const initialState: ChatState = {
  items: [],
  searchUsers: [],
  searchChats: [],
  loading: false,
  searchLoading: false,
  groupLoading: false,
  error: null,
};

export const fetchChats = createAsyncThunk<Chat[], void, { rejectValue: string }>(
  'chat/fetchChats',
  async (_, thunkAPI) => {
    try {
      return await getChats();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to fetch chats';
      return thunkAPI.rejectWithValue(message);
    }
  },
);

export const searchChats = createAsyncThunk<
  { users: User[]; chats: Chat[] },
  string,
  { rejectValue: string }
>('chat/searchChats', async (query, thunkAPI) => {
  try {
    return await searchChatEntities(query);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to search chats';
    return thunkAPI.rejectWithValue(message);
  }
});

export const createChatGroup = createAsyncThunk<Chat, { title: string; memberIds: number[] }, { rejectValue: string }>(
  'chat/createChatGroup',
  async (payload, thunkAPI) => {
    try {
      return await createGroupChat(payload.title, payload.memberIds);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create group chat';
      return thunkAPI.rejectWithValue(message);
    }
  },
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setChats(state, action: PayloadAction<Chat[]>) {
      state.items = action.payload;
      state.error = null;
    },
    addChat(state, action: PayloadAction<Chat>) {
      const exists = state.items.some((chat) => chat.id === action.payload.id);
      if (!exists) {
        state.items.unshift(action.payload);
      }
    },
    setSearchResults(state, action: PayloadAction<{ users: User[]; chats: Chat[] }>) {
      state.searchUsers = action.payload.users;
      state.searchChats = action.payload.chats;
    },
    clearSearch(state) {
      state.searchUsers = [];
      state.searchChats = [];
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChats.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loading = false;
      })
      .addCase(fetchChats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? action.error.message ?? 'Unable to fetch chats';
      })
      .addCase(searchChats.pending, (state) => {
        state.searchLoading = true;
        state.error = null;
      })
      .addCase(searchChats.fulfilled, (state, action) => {
        state.searchUsers = action.payload.users;
        state.searchChats = action.payload.chats;
        state.searchLoading = false;
      })
      .addCase(searchChats.rejected, (state, action) => {
        state.searchLoading = false;
        state.error = action.payload ?? action.error.message ?? 'Unable to search chats';
      })
      .addCase(createChatGroup.pending, (state) => {
        state.groupLoading = true;
        state.error = null;
      })
      .addCase(createChatGroup.fulfilled, (state, action) => {
        state.groupLoading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createChatGroup.rejected, (state, action) => {
        state.groupLoading = false;
        state.error = action.payload ?? action.error.message ?? 'Unable to create group chat';
      });
  },
});

export const { setChats, addChat, setSearchResults, clearSearch, setError } = chatSlice.actions;
export default chatSlice.reducer;
