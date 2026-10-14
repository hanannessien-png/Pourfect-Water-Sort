import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

/** Minted gold coin: bevelled rim, inner face, embossed star. */
export function Coin({ size = 24 }: { size?: number }) {
  const inner = size * 0.74;
  return (
    <View style={[styles.shadow, { width: size, height: size + 2, borderRadius: size / 2 }]}>
      <LinearGradient colors={['#FFF4BF', '#F5C13E', '#B9770F']} style={[styles.center, { width: size, height: size, borderRadius: size / 2 }]}>
        <LinearGradient
          colors={['#D99A22', '#FFD964']}
          style={[styles.center, { width: inner, height: inner, borderRadius: inner / 2, borderWidth: Math.max(1, size * 0.04), borderColor: 'rgba(122,69,8,0.55)' }]}
        >
          <Ionicons name="star" size={size * 0.42} color="#A8650C" />
        </LinearGradient>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: { backgroundColor: '#7A4508' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
