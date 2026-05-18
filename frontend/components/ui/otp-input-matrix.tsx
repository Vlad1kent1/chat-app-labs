import { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  AppState,
} from 'react-native';
import * as Clipboard from 'expo-clipboard'; // 👈 Наш рятівник

interface OTPInputMatrixProps {
  length: number;
  value: string[];
  onChangeValue: (value: string[]) => void;
}

export function OTPInputMatrix({ length, value, onChangeValue }: OTPInputMatrixProps) {
  const inputsRef = useRef<Array<TextInput | null>>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [clipboardContent, setClipboardContent] = useState<string>('');

  // Функція для перевірки, що лежить в буфері обміну
  const checkClipboard = async () => {
    const hasString = await Clipboard.hasStringAsync();
    if (hasString) {
      const text = await Clipboard.getStringAsync();
      // Якщо в буфері суто цифри і довжина підходить під наш OTP
      if (/^[0-9]+$/.test(text.trim()) && text.trim().length === length) {
        setClipboardContent(text.trim());
        return;
      }
    }
    setClipboardContent('');
  };

  // Перевіряємо буфер при монтуванні та коли користувач повертається в додаток
  useEffect(() => {
    checkClipboard();
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkClipboard();
      }
    });
    return () => subscription.remove();
  }, []);

  // Функція для ручної вставки в один клік
  const handleButtonPaste = () => {
    if (clipboardContent) {
      const pastedArray = clipboardContent.split('');
      onChangeValue(pastedArray);
      inputsRef.current[length - 1]?.focus();
    }
  };

  const handleDigitChange = (text: string, index: number) => {
    if (text === '') {
      const newValue = [...value];
      newValue[index] = '';
      onChangeValue(newValue);
      return;
    }

    if (!/^[0-9]+$/.test(text)) return;

    // Якщо раптом спрацювала нативна вставка iOS Auto-fill
    if (text.length > 1) {
      const pastedCode = text.trim().slice(0, length).split('');
      const newValue = Array(length).fill('');
      for (let i = 0; i < length; i++) newValue[i] = pastedCode[i] || '';
      onChangeValue(newValue);
      inputsRef.current[Math.min(pastedCode.length, length - 1)]?.focus();
      return;
    }

    const newValue = [...value];
    newValue[index] = text;
    onChangeValue(newValue);

    if (index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = ({ nativeEvent }: { nativeEvent: { key: string } }, index: number) => {
    if (nativeEvent.key === 'Backspace') {
      if (!value[index] && index > 0) {
        inputsRef.current[index - 1]?.focus();
        const newValue = [...value];
        newValue[index - 1] = '';
        onChangeValue(newValue);
      } else {
        const newValue = [...value];
        newValue[index] = '';
        onChangeValue(newValue);
      }
    }
  };

  const boxSize = (Dimensions.get('window').width - 48 - 24) / length;

  return (
    <View style={styles.mainWrapper}>
      {/* Матриця інпутів */}
      <View style={[styles.container, { gap: 8 }]}>
        {Array.from({ length }).map((_, index) => (
          <TextInput
            key={`otp-${index}`}
            ref={(ref) => {
              inputsRef.current[index] = ref;
            }}
            value={value[index] || ''}
            onChangeText={(text) => handleDigitChange(text, index)}
            onKeyPress={(event) => handleKeyPress(event, index)}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            style={[
              styles.input,
              {
                width: boxSize,
                height: boxSize,
                borderColor: focusedIndex === index ? '#000000' : '#E5E7EB',
                borderWidth: focusedIndex === index ? 2 : 1,
              },
            ]}
            textAlign="center"
            selectionColor="#000000"
            onFocus={() => setFocusedIndex(index)}
            onBlur={() => setFocusedIndex(null)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    backgroundColor: '#FFFFFF',
    color: '#000000',
    fontSize: 24,
    fontWeight: '600',
    borderRadius: 8,
  },
});