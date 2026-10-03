import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import Svg, { Polygon, Line, Rect } from 'react-native-svg';
import { DetectionItem } from '../services/api';
import { DexTheme } from '../constants/dexTheme';

interface DetectionOverlayProps {
  width: number;
  height: number;
  detections: DetectionItem[];
  isScanning: boolean;
  onSelectDetection?: (item: DetectionItem) => void;
  selectedId?: string;
}

export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  width,
  height,
  detections,
  isScanning,
  onSelectDetection,
  selectedId,
}) => {
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Scanning laser animation
  useEffect(() => {
    if (isScanning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: height,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scanLineAnim.setValue(0);
    }
  }, [isScanning, height]);

  // Target lock pulse animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.95, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="box-none">
      {/* Laser Scanning Line */}
      {isScanning && (
        <Animated.View
          style={[
            styles.laserLine,
            {
              width: width - 32,
              transform: [{ translateY: scanLineAnim }],
            },
          ]}>
          <View style={styles.laserCore} />
        </Animated.View>
      )}

      {/* SVG Segmentation Contours */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        {detections.map((det) => {
          if (!det.polygon || det.polygon.length < 3) return null;

          const pointsStr = det.polygon
            .map(([px, py]) => `${px * width},${py * height}`)
            .join(' ');

          const isSelected = selectedId === det.id;
          const strokeColor = det.is_animal
            ? isSelected
              ? DexTheme.colors.contourGreen
              : DexTheme.colors.contourCyan
            : DexTheme.colors.contourYellow;

          const fillColor = det.is_animal
            ? isSelected
              ? 'rgba(34, 197, 94, 0.28)'
              : 'rgba(0, 240, 255, 0.22)'
            : 'rgba(251, 191, 36, 0.20)';

          return (
            <Polygon
              key={`poly_${det.id}`}
              points={pointsStr}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={isSelected ? '3.5' : '2.2'}
              strokeDasharray={isSelected ? '6,3' : undefined}
            />
          );
        })}
      </Svg>

      {/* Interactive Detection Bounding Boxes & Pokédex HUD Badges */}
      {detections.map((det) => {
        const boxX = det.box.xmin * width;
        const boxY = det.box.ymin * height;
        const boxW = Math.max(40, (det.box.xmax - det.box.xmin) * width);
        const boxH = Math.max(40, (det.box.ymax - det.box.ymin) * height);
        const isSelected = selectedId === det.id;

        return (
          <TouchableOpacity
            key={`box_${det.id}`}
            activeOpacity={0.8}
            onPress={() => onSelectDetection && onSelectDetection(det)}
            style={[
              styles.boxContainer,
              {
                left: boxX,
                top: boxY,
                width: boxW,
                height: boxH,
              },
            ]}>
            {/* Pokédex Corner Brackets */}
            <View style={[styles.corner, styles.cornerTL, isSelected && styles.cornerActive]} />
            <View style={[styles.corner, styles.cornerTR, isSelected && styles.cornerActive]} />
            <View style={[styles.corner, styles.cornerBL, isSelected && styles.cornerActive]} />
            <View style={[styles.corner, styles.cornerBR, isSelected && styles.cornerActive]} />

            {/* Target Crosshair in Center */}
            <View style={styles.crosshair}>
              <View style={[styles.crosshairH, isSelected && styles.crosshairActive]} />
              <View style={[styles.crosshairV, isSelected && styles.crosshairActive]} />
            </View>

            {/* Pokédex Target Info Badge */}
            <View style={[styles.badge, isSelected && styles.badgeActive]}>
              <View style={styles.badgeTop}>
                <View
                  style={[
                    styles.badgeDot,
                    det.is_animal ? styles.badgeDotAnimal : styles.badgeDotObject,
                  ]}
                />
                <Text style={styles.badgeTitle} numberOfLines={1}>
                  {det.dex_entry?.name || det.class_name.toUpperCase()}
                </Text>
                <Text style={styles.badgeConf}>
                  {Math.round(det.confidence * 100)}%
                </Text>
              </View>

              {det.dex_entry?.category && (
                <Text style={styles.badgeCategory} numberOfLines={1}>
                  #{det.dex_entry.dex_number} · {det.dex_entry.category}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Decorative Viewfinder Grid Overlay */}
      <View style={styles.viewfinderGuides} pointerEvents="none">
        <View style={styles.gridLineH} />
        <View style={styles.gridLineV} />
        {/* Outer Corner Accents */}
        <View style={[styles.outerCorner, styles.ocTL]} />
        <View style={[styles.outerCorner, styles.ocTR]} />
        <View style={[styles.outerCorner, styles.ocBL]} />
        <View style={[styles.outerCorner, styles.ocBR]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  laserLine: {
    position: 'absolute',
    left: 16,
    height: 3,
    backgroundColor: '#00F0FF',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 8,
    borderRadius: 2,
    zIndex: 10,
  },
  laserCore: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
  },
  boxContainer: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.4)',
    borderRadius: 6,
  },
  corner: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderColor: '#00F0FF',
  },
  cornerActive: {
    borderColor: '#10B981',
    width: 16,
    height: 16,
    borderWidth: 3,
  },
  cornerTL: { top: -2, left: -2, borderTopWidth: 2.5, borderLeftWidth: 2.5 },
  cornerTR: { top: -2, right: -2, borderTopWidth: 2.5, borderRightWidth: 2.5 },
  cornerBL: { bottom: -2, left: -2, borderBottomWidth: 2.5, borderLeftWidth: 2.5 },
  cornerBR: { bottom: -2, right: -2, borderBottomWidth: 2.5, borderRightWidth: 2.5 },
  crosshair: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 14,
    height: 14,
    marginLeft: -7,
    marginTop: -7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crosshairH: {
    position: 'absolute',
    width: 14,
    height: 1.5,
    backgroundColor: 'rgba(0, 240, 255, 0.6)',
  },
  crosshairV: {
    position: 'absolute',
    width: 1.5,
    height: 14,
    backgroundColor: 'rgba(0, 240, 255, 0.6)',
  },
  crosshairActive: {
    backgroundColor: '#10B981',
  },
  badge: {
    position: 'absolute',
    bottom: -32,
    left: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#00F0FF',
    minWidth: 120,
    elevation: 4,
  },
  badgeActive: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(6, 78, 59, 0.92)',
  },
  badgeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeDotAnimal: {
    backgroundColor: '#10B981',
  },
  badgeDotObject: {
    backgroundColor: '#FBBF24',
  },
  badgeTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
    flex: 1,
  },
  badgeConf: {
    color: '#38BDF8',
    fontWeight: '800',
    fontSize: 10,
  },
  badgeCategory: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 1,
  },
  viewfinderGuides: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    margin: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.18)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridLineH: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
  },
  gridLineV: {
    position: 'absolute',
    height: '100%',
    width: 1,
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
  },
  outerCorner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: '#FFCB05',
  },
  ocTL: { top: -2, left: -2, borderTopWidth: 3, borderLeftWidth: 3 },
  ocTR: { top: -2, right: -2, borderTopWidth: 3, borderRightWidth: 3 },
  ocBL: { bottom: -2, left: -2, borderBottomWidth: 3, borderLeftWidth: 3 },
  ocBR: { bottom: -2, right: -2, borderBottomWidth: 3, borderRightWidth: 3 },
});
