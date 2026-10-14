import React, { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { getBannerRenderer, useAdState } from './service';

/**
 * Bottom banner with a reserved height so the layout never jumps when the ad loads.
 * Renders nothing (and reserves nothing) when ads are unavailable or `hidden` is set.
 */
export function BannerSlot({ hidden = false }: { hidden?: boolean }) {
  const ready = useAdState((s) => s.ready);
  const { width } = useWindowDimensions();
  const reserved = width >= 600 ? 90 : 62;
  const [height, setHeight] = useState(reserved);
  const render = ready ? getBannerRenderer() : null;
  if (hidden || !render) return null;
  return (
    <View style={[styles.slot, { height: Math.max(reserved, height) }]} testID="banner-slot">
      {render({ onHeight: (h) => setHeight(Math.ceil(h)) })}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
