import * as SecureStore from 'expo-secure-store';
import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@types';
import { login, updateProfile, deleteAccount } from '@services/modules/auth.service';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

interface AuthResponse {
  user: User;
  token: string;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,
};

export const loginUser = createAsyncThunk<AuthResponse, { email: string; password: string }, { rejectValue: string }>(
  'auth/loginUser',
  async (payload, thunkAPI) => {
    try {
      const authResponse = await login({ email: payload.email, password: payload.password });

      const token = authResponse.token || (authResponse as any).data?.token || (authResponse as any).accessToken;
      const user = authResponse.user || (authResponse as any).data?.user;

      if (!token) {
        throw new Error('Token is missing in backend auth response structure');
      }

      try {
        await SecureStore.setItemAsync('authToken', String(token));
        await SecureStore.setItemAsync('authUser', JSON.stringify(user));
      } catch (storageError) {
        console.error('SecureStore save failed', storageError);
      }

      return { user, token } as AuthResponse;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign in';
      return thunkAPI.rejectWithValue(message);
    }
  },
);

export const setCredentials = createAsyncThunk<
  AuthResponse,          
  AuthResponse,          
  { rejectValue: string } 
>(
  'auth/setCredentials',
  async (credentials, thunkAPI) => {
    try {
      await SecureStore.setItemAsync('authToken', credentials.token);
      await SecureStore.setItemAsync('authUser', JSON.stringify(credentials.user));
      return credentials;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to store credentials';
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await SecureStore.deleteItemAsync('authToken');
    await SecureStore.deleteItemAsync('authUser');
  } catch (error) {
    console.error('Failed to clear auth storage during logout:', error);
  }
});

/**
 * Update authenticated user's profile information.
 * Updates user object in Redux state and SecureStore upon success.
 */
export const updateUserProfile = createAsyncThunk<
  User,
  {
    firstName?: string;
    lastName?: string;
    username?: string;
    email?: string;
    phone?: string;
    avatarUrl?: string;
  },
  { rejectValue: string }
>('auth/updateProfile', async (profileData, thunkAPI) => {
  try {
    if (profileData.username) {
      const trimmed = profileData.username.trim();
      profileData.username = trimmed.startsWith('@') ? trimmed : `@${trimmed.replace(/^@+/, '')}`;
    }

    const state = thunkAPI.getState() as { auth: AuthState };
    const currentToken = state.auth.token;

    const updatedUser = await updateProfile(profileData, currentToken);

    try {
      await SecureStore.setItemAsync('authUser', JSON.stringify(updatedUser));
    } catch (storageError) {
      console.error('[AUTH] SecureStore update failed during profile update', storageError);
    }

    return updatedUser as User;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update profile';
    return thunkAPI.rejectWithValue(message);
  }
});

/**
 * Delete authenticated user's account permanently.
 * Clears all credentials and resets auth state.
 * User will be redirected to login screen.
 */
export const deleteUserAccount = createAsyncThunk<
  void,                  
  void,                   
  { rejectValue: string }
>('auth/deleteAccount', async (_, thunkAPI) => {
  try {
    const state = thunkAPI.getState() as { auth: AuthState };
    const currentToken = state.auth.token;

    await deleteAccount(currentToken);

    // Clear all auth data from storage
    try {
      await SecureStore.deleteItemAsync('authToken');
      await SecureStore.deleteItemAsync('authUser');
    } catch (storageError) {
      console.error('[AUTH] Failed to clear storage during account deletion', storageError);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to delete account';
    return thunkAPI.rejectWithValue(message);
  }
});

export const initializeAuth = createAsyncThunk<
  { token: string | null; user: User | null },
  void,
  { rejectValue: string }
>('auth/initializeAuth', async (_, thunkAPI) => {
  try {
    const token = await SecureStore.getItemAsync('authToken');
    const userJson = await SecureStore.getItemAsync('authUser');

    let user: User | null = null;

    if (userJson) {
      try {
        user = JSON.parse(userJson) as User;
      } catch (parseError) {
        console.error('[AUTH] Failed to parse stored user:', parseError);
        user = null;
      }
    }

    if (token && user) {
      console.log('[AUTH] Session restored for user:', user.email);
    }

    return { token, user };
  } catch (error) {
    console.error('[AUTH] Initialization error:', error);
    return thunkAPI.rejectWithValue('Unable to restore authentication');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    setUserStatus(state, action: PayloadAction<{ isOnline: boolean; lastSeen?: string }>) {
      if (state.user) {
        state.user.isOnline = action.payload.isOnline;
        if (action.payload.lastSeen) {
          state.user.lastSeen = action.payload.lastSeen;
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.isInitialized = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? action.error.message ?? 'Unable to sign in';
      })
      .addCase(setCredentials.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(setCredentials.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.isInitialized = true;
        state.error = null;
      })
      .addCase(setCredentials.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? action.error.message ?? 'Unable to sign in';
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.isLoading = false;
        state.isInitialized = true; 
        state.error = null;
      })
      .addCase(updateUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action: PayloadAction<User>) => {
        state.user = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Unable to update profile';
      })
      .addCase(deleteUserAccount.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteUserAccount.fulfilled, () => initialState)
      .addCase(deleteUserAccount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Unable to delete account';
      })
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true;
        state.isInitialized = false;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.user = action.payload.user ?? null;
        state.isAuthenticated = Boolean(action.payload.token && action.payload.user);
        state.isLoading = false;
        state.isInitialized = true;
      if (!action.payload.token || !action.payload.user) {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      }
    })
    .addCase(initializeAuth.rejected, (state) => {
      state.isAuthenticated = false;
      state.token = null;
      state.user = null;
      state.isLoading = false;
      state.isInitialized = true;
    });
  },
});

export const { clearError, setUserStatus } = authSlice.actions;
export default authSlice.reducer;
