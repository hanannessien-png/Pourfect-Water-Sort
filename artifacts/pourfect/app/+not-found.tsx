import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Backdrop } from '@/src/render/Backdrop';
import { Button } from '@/src/ui/Button';
import { colors, fonts, space } from '@/src/ui/theme';

export default function NotFoundScreen() {
  return (
    <View style={styles.root}>
      <Backdrop />
      <Text style={styles.title}>Spilled!</Text>
      <Text style={styles.body}>This screen does not exist.</Text>
      <Button label="Home" icon="home" onPress={() => router.replace('/')} style={{ marginTop: space(3) }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space(3) },
  title: { fontFamily: fonts.bold, fontSize: 36, color: colors.text },
  body: { fontFamily: fonts.medium, fontSize: 16, color: colors.textMuted, marginTop: space(1) },
});
