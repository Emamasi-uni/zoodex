import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Image } from 'react-native';
import { AnimalCandidate } from '../services/api';
import { DexTheme } from '../constants/dexTheme';
import { Ionicons } from '@expo/vector-icons';

interface ConfirmAnimalModalProps {
  candidate: AnimalCandidate | null;
  onConfirm: (candidate: AnimalCandidate) => void;
  onDismiss: () => void;
}

export const ConfirmAnimalModal: React.FC<ConfirmAnimalModalProps> = ({
  candidate,
  onConfirm,
  onDismiss,
}) => {
  const slideAnim = useRef(new Animated.Value(200)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (candidate) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 75,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(200);
      opacityAnim.setValue(0);
    }
  }, [candidate]);

  if (!candidate) return null;

  const confidencePct = Math.round((candidate.confidence || 0.85) * 100);

  return (
    <Modal visible={!!candidate} transparent animationType="fade">
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.bottomSheetCard,
            {
              transform: [{ translateY: slideAnim }],
              opacity: opacityAnim,
            },
          ]}>
          {/* Header Banner */}
          <View style={styles.banner}>
            <View style={styles.statusIndicator} />
            <Text style={styles.bannerText}>SPECIE FAUNISTICA RILEVATA</Text>
            <Text style={styles.bannerId}>#{candidate.dex_number}</Text>
          </View>

          {/* Compact Profile Row: Photo + Bio Data */}
          <View style={styles.profileRow}>
            {/* Real Animal Photograph Thumbnail */}
            <View style={styles.thumbnailWrapper}>
              {candidate.image_url ? (
                <Image
                  source={{ uri: candidate.image_url }}
                  style={styles.thumbnailImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.thumbnailFallback}>
                  <Ionicons name="scan-outline" size={28} color="#00E5FF" />
                </View>
              )}
              <View style={styles.rarityTag}>
                <Text style={styles.rarityTagText}>{candidate.rarity.toUpperCase()}</Text>
              </View>
            </View>

            {/* Specimen Details */}
            <View style={styles.specimenDetails}>
              <Text style={styles.animalName} numberOfLines={1}>
                {candidate.name}
              </Text>
              <Text style={styles.scientificName} numberOfLines={1}>
                {candidate.scientific_name}
              </Text>

              <View style={styles.metaRow}>
                <View style={styles.metaChip}>
                  <Ionicons name="globe-outline" size={11} color="#00E5FF" />
                  <Text style={styles.metaText}>{candidate.continent_name.toUpperCase()}</Text>
                </View>

                <View style={styles.confidenceChip}>
                  <Ionicons name="shield-checkmark-outline" size={11} color="#10B981" />
                  <Text style={styles.confidenceText}>AFFIDABILITÀ {confidencePct}%</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Confirmation Prompt */}
          <View style={styles.promptBanner}>
            <Ionicons name="help-circle-outline" size={16} color="#00E5FF" />
            <Text style={styles.promptText}>
              Verifica che l'animale scontornato corrisponda a questa specie prima di registrarlo nel catalogo.
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              activeOpacity={0.8}
              onPress={onDismiss}>
              <Ionicons name="close-circle-outline" size={17} color="#94A3B8" />
              <Text style={styles.cancelBtnText}>RILEVAZIONE ERRATA</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmBtn}
              activeOpacity={0.8}
              onPress={() => onConfirm(candidate)}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>CONFERMA E REGISTRA</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.45)', // Translucent backdrop so the viewfinder and SVG contours above stay clearly visible!
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 16,
    paddingHorizontal: 12,
  },
  bottomSheetCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#00E5FF',
    overflow: 'hidden',
    elevation: 24,
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  banner: {
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00E5FF',
    marginRight: 8,
  },
  bannerText: {
    color: '#00E5FF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    flex: 1,
  },
  bannerId: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  profileRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    alignItems: 'center',
  },
  thumbnailWrapper: {
    width: 84,
    height: 84,
    borderRadius: 10,
    backgroundColor: '#020617',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  rarityTag: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    right: 2,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 4,
    paddingVertical: 1,
    alignItems: 'center',
  },
  rarityTagText: {
    color: '#FBBF24',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  specimenDetails: {
    flex: 1,
  },
  animalName: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  scientificName: {
    color: '#94A3B8',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 4,
  },
  metaText: {
    color: '#E2E8F0',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  confidenceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10B981',
    gap: 4,
  },
  confidenceText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  promptBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    marginHorizontal: 12,
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  promptText: {
    color: '#CBD5E1',
    fontSize: 10,
    flex: 1,
    lineHeight: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
    paddingVertical: 11,
    borderRadius: 8,
    gap: 6,
  },
  cancelBtnText: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  confirmBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
    gap: 6,
    elevation: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
