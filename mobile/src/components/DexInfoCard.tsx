import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
} from 'react-native';
import { DetectionItem, DexEntry } from '../services/api';
import { DexTheme } from '../constants/dexTheme';
import { Ionicons } from '@expo/vector-icons';

interface DexInfoCardProps {
  detection: DetectionItem;
  onClose: () => void;
  onOpenDex?: (continentId: string) => void;
  onConfirmUnlock?: (animal: DexEntry) => void;
}

export const DexInfoCard: React.FC<DexInfoCardProps> = ({
  detection,
  onClose,
  onOpenDex,
  onConfirmUnlock,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const dex = detection.dex_entry;
  const isAnimal = detection.is_animal;
  const confidencePct = Math.round(detection.confidence * 100);

  return (
    <>
      {/* 1. Compact Card below Camera (No clipping) */}
      <View style={styles.compactCardWrapper}>
        <View style={styles.bezelFrame}>
          {/* Header Bar */}
          <View style={styles.screenHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.dexNoBadge}>
                <Text style={styles.dexNoText}>#{dex.dex_number}</Text>
              </View>
              <View style={styles.continentTag}>
                <Ionicons name="globe-outline" size={11} color="#38BDF8" />
                <Text style={styles.continentText}>{dex.continent_name.toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => setIsExpanded(true)}
                style={styles.expandHeaderBtn}
                activeOpacity={0.7}>
                <Ionicons name="expand-outline" size={14} color="#00E5FF" />
                <Text style={styles.expandHeaderBtnText}>ESPANDI</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                <Ionicons name="close" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Compact Body */}
          <TouchableOpacity
            style={styles.compactBody}
            activeOpacity={0.9}
            onPress={() => setIsExpanded(true)}>
            {/* Real Animal Photo / Object Thumbnail */}
            {dex.image_url ? (
              <Image source={{ uri: dex.image_url }} style={styles.compactThumb} resizeMode="cover" />
            ) : (
              <View style={styles.compactThumbFallback}>
                <Ionicons
                  name={isAnimal ? 'leaf-outline' : 'cube-outline'}
                  size={22}
                  color="#38BDF8"
                />
              </View>
            )}

            {/* Middle Info */}
            <View style={styles.compactInfo}>
              <Text style={styles.compactTitle} numberOfLines={1}>
                {dex.name}
              </Text>
              <Text style={styles.compactSub} numberOfLines={1}>
                {dex.scientific_name}
              </Text>

              <View style={styles.compactMetaRow}>
                <Text style={styles.compactCategory}>{dex.category}</Text>
                <View style={styles.compactConfidenceBadge}>
                  <Text style={styles.compactConfidenceText}>{confidencePct}% ACC</Text>
                </View>
              </View>
            </View>

            {/* Quick Expand Chevron */}
            <View style={styles.expandChevronBox}>
              <Ionicons name="chevron-up-circle-outline" size={24} color="#00E5FF" />
              <Text style={styles.tapToOpenText}>DETTAGLI</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Full-Screen Expanded Dossier Modal */}
      <Modal visible={isExpanded} animationType="slide" transparent={false}>
        <View style={styles.fullScreenContainer}>
          {/* Full Screen Top Navigation */}
          <View style={styles.fullScreenTopNav}>
            <TouchableOpacity
              onPress={() => setIsExpanded(false)}
              style={styles.fullNavBackBtn}
              activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              <Text style={styles.fullNavBackText}>TORNA AL MIRINO</Text>
            </TouchableOpacity>

            <View style={styles.fullNavBadge}>
              <Text style={styles.fullNavBadgeText}>DEX #{dex.dex_number}</Text>
            </View>
          </View>

          <ScrollView
            style={styles.fullScroll}
            contentContainerStyle={styles.fullScrollContent}
            showsVerticalScrollIndicator={false}>
            {/* Massive Hero Photo */}
            <View style={styles.heroImageContainer}>
              {dex.image_url ? (
                <Image
                  source={{ uri: dex.image_url }}
                  style={styles.heroImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.heroFallback}>
                  <Ionicons name="scan-outline" size={64} color="#00E5FF" />
                </View>
              )}
              <View style={styles.heroGradient} />

              <View style={styles.heroRarityBadge}>
                <Text style={styles.heroRarityText}>{dex.rarity.toUpperCase()}</Text>
              </View>

              <View style={styles.heroMatchBadge}>
                <Ionicons name="shield-checkmark-outline" size={13} color="#10B981" />
                <Text style={styles.heroMatchText}>ACCURATEZZA MODELLO {confidencePct}%</Text>
              </View>
            </View>

            {/* Specimen Nomenclature */}
            <View style={styles.fullSectionHeader}>
              <Text style={styles.fullSpecimenName}>{dex.name}</Text>
              <Text style={styles.fullScientificName}>{dex.scientific_name}</Text>

              <View style={styles.fullTagsRow}>
                <View style={styles.fullTagChip}>
                  <Ionicons name="globe-outline" size={13} color="#00E5FF" />
                  <Text style={styles.fullTagChipText}>{dex.continent_name.toUpperCase()}</Text>
                </View>
                <View style={styles.fullTagChip}>
                  <Ionicons name="layers-outline" size={13} color="#FBBF24" />
                  <Text style={styles.fullTagChipText}>{dex.category.toUpperCase()}</Text>
                </View>
              </View>
            </View>

            {/* Biometric Grid */}
            <View style={styles.biometricGrid}>
              <View style={styles.bioCard}>
                <Ionicons name="resize-outline" size={16} color="#00E5FF" />
                <Text style={styles.bioCardLabel}>DIMENSIONE</Text>
                <Text style={styles.bioCardValue}>{dex.height}</Text>
              </View>

              <View style={styles.bioCard}>
                <Ionicons name="scale-outline" size={16} color="#00E5FF" />
                <Text style={styles.bioCardLabel}>MASSA</Text>
                <Text style={styles.bioCardValue}>{dex.weight}</Text>
              </View>

              <View style={styles.bioCard}>
                <Ionicons name="sparkles-outline" size={16} color="#FBBF24" />
                <Text style={styles.bioCardLabel}>RARITÀ</Text>
                <Text style={[styles.bioCardValue, { color: '#FBBF24' }]}>{dex.rarity}</Text>
              </View>
            </View>

            {/* Habitat Box */}
            {dex.habitat && (
              <View style={styles.dossierBox}>
                <View style={styles.dossierBoxHeader}>
                  <Ionicons name="map-outline" size={15} color="#00E5FF" />
                  <Text style={styles.dossierBoxTitle}>HABITAT E BIOMA NATURALE</Text>
                </View>
                <Text style={styles.dossierBoxText}>{dex.habitat}</Text>
              </View>
            )}

            {/* Description Dossier */}
            <View style={styles.dossierBox}>
              <View style={styles.dossierBoxHeader}>
                <Ionicons name="document-text-outline" size={15} color="#00E5FF" />
                <Text style={styles.dossierBoxTitle}>SCHEDA BIOLOGICA E COMPORTAMENTO</Text>
              </View>
              <Text style={styles.dossierBoxText}>{dex.description}</Text>
            </View>

            {/* Action Buttons in Full Screen */}
            <View style={styles.fullActionsArea}>
              {isAnimal && onConfirmUnlock && (
                <TouchableOpacity
                  style={styles.fullConfirmUnlockBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    setIsExpanded(false);
                    onConfirmUnlock(dex);
                  }}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.fullConfirmUnlockBtnText}>
                    CONFERMA E AGGIUNGI ALLO ZOODEX
                  </Text>
                </TouchableOpacity>
              )}

              {isAnimal && onOpenDex && (
                <TouchableOpacity
                  style={styles.fullOpenDexBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    setIsExpanded(false);
                    onClose();
                    onOpenDex(dex.continent);
                  }}>
                  <Ionicons name="folder-open-outline" size={16} color="#00E5FF" />
                  <Text style={styles.fullOpenDexBtnText}>APRI CATALOGO CONTINENTALE</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // Compact Card Styles
  compactCardWrapper: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 4,
  },
  bezelFrame: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#00E5FF',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dexNoBadge: {
    backgroundColor: DexTheme.colors.pokedexRed,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dexNoText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  continentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  continentText: {
    color: '#38BDF8',
    fontWeight: '800',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expandHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#00E5FF',
    gap: 3,
  },
  expandHeaderBtnText: {
    color: '#00E5FF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  closeBtn: {
    padding: 2,
  },
  compactBody: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 10,
  },
  compactThumb: {
    width: 58,
    height: 58,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
  },
  compactThumbFallback: {
    width: 58,
    height: 58,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  compactInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  compactTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  compactSub: {
    color: '#94A3B8',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 1,
    marginBottom: 4,
  },
  compactMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactCategory: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '700',
  },
  compactConfidenceBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  compactConfidenceText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '800',
  },
  expandChevronBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
  },
  tapToOpenText: {
    color: '#00E5FF',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 2,
  },

  // Full Screen Dossier Styles
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  fullScreenTopNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: DexTheme.colors.pokedexRed,
    borderBottomWidth: 2,
    borderBottomColor: DexTheme.colors.pokedexRedDeep,
  },
  fullNavBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fullNavBackText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.8,
  },
  fullNavBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  fullNavBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  fullScroll: {
    flex: 1,
  },
  fullScrollContent: {
    paddingBottom: 40,
  },
  heroImageContainer: {
    width: '100%',
    height: 240,
    backgroundColor: '#020617',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'rgba(9, 13, 22, 0.6)',
  },
  heroRarityBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FBBF24',
  },
  heroRarityText: {
    color: '#FBBF24',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  heroMatchBadge: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10B981',
    gap: 4,
  },
  heroMatchText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  fullSectionHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  fullSpecimenName: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  fullScientificName: {
    color: '#94A3B8',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 2,
    marginBottom: 12,
  },
  fullTagsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  fullTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 5,
  },
  fullTagChipText: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  biometricGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  bioCard: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 4,
  },
  bioCardLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  bioCardValue: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '900',
  },
  dossierBox: {
    backgroundColor: '#0F172A',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  dossierBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  dossierBoxTitle: {
    color: '#00E5FF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  dossierBoxText: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 20,
  },
  fullActionsArea: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  fullConfirmUnlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#10B981',
    gap: 8,
    elevation: 4,
  },
  fullConfirmUnlockBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  fullOpenDexBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  fullOpenDexBtnText: {
    color: '#00E5FF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
