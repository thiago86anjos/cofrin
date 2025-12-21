import { Platform } from 'react-native';

export function getModalContainerStyle(colors: any) {
  const base = {
    width: '100%',
    paddingLeft: 32,
    paddingRight: 32,
    paddingTop: 32,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  };
  if (Platform.OS === 'web') {
    return {
      ...base,
      maxWidth: 1200,
      alignSelf: 'center',
      marginTop: 'auto',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    };
  }
  // Mobile: 100% largura, colado no fundo
  return {
    ...base,
    alignSelf: 'stretch',
  };
}
