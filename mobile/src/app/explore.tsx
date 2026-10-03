import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { DexTheme } from '../constants/dexTheme';
import { DexHeader } from '../components/DexHeader';
import { ZoodexApi, AnimalItem, ContinentItem } from '../services/api';
import { useDexStore } from '../store/dexStore';

export default function ExploreScreen() {
  const router = useRouter();
  const { selectedContinent, setSelectedContinent } = useDexStore();

  const [continents, setContinents] = useState<ContinentItem[]>([]);
  const [animals, setAnimals] = useState<AnimalItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAnimal, setSelectedAnimal] = useState<AnimalItem | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedContinent]);

  const loadData = async () => {
    setLoading(true);
    try {
      const contData = await ZoodexApi.getContinents('pixel8a_user');
      setContinents(contData);

      const animData = await ZoodexApi.getAnimals(
        selectedContinent === 'all' ? undefined : selectedContinent,
        'pixel8a_user'
      );
      setAnimals(animData);
    } catch (e) {
      console.warn('Errore caricamento catalogo:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredAnimals = animals.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.scientific_name.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q) ||
      a.dex_number.includes(q)
    );
  });

  const unlockedCount = animals.filter((a) => a.is_unlocked).length;
  const totalCount = animals.length;
  const progressPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <DexHeader title="ARCHIVIO FAUNA GLOBALE" />

      <View style={styles.container}>
        {/* Continent Filter Carousel */}
        <View style={styles.filterBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}>
            <TouchableOpacity
              style={[
                styles.continentChip,
                selectedContinent === 'all' && styles.continentChipActive,
              ]}
              onPress={() => setSelectedContinent('all')}>
              <Text
                style={[
                  styles.continentChipText,
                  selectedContinent === 'all' && styles.continentChipTextActive,
                ]}>
                TUTTI I CONTINENTI
              </Text>
            </TouchableOpacity>

            {continents.map((c) => {
              const isActive = selectedContinent === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.continentChip,
                    isActive && styles.continentChipActive,
                    { borderColor: c.color },
                  ]}
                  onPress={() => setSelectedContinent(c.id)}>
                  <Text
                    style={[
                      styles.continentChipText,
                      isActive && styles.continentChipTextActive,
                    ]}>
                    {c.name.toUpperCase()} ({c.discovered_animals}/{c.total_animals})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Global Progress Bar */}
        <View style={styles.progressBezel}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>STATO ACQUISIZIONE BIODIVERSITÀ</Text>
            <Text style={styles.progressValue}>
              {unlockedCount} / {totalCount} SPECIE ({progressPercent}%)
            </Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.max(4, progressPercent)}%` },
              ]}
            />
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={15} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca specie per nome, numero o categoria..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#64748B" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Animals Grid */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#00E5FF" />
            <Text style={styles.loadingText}>ACCESSO DATABASE FAUNA...</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.gridContainer}
            showsVerticalScrollIndicator={false}>
            {filteredAnimals.map((animal) => {
              const isUnlocked = animal.is_unlocked;

              return (
                <TouchableOpacity
                  key={animal.dex_number}
                  style={[
                    styles.animalCard,
                    isUnlocked ? styles.cardUnlocked : styles.cardLocked,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedAnimal(animal)}>
                  {/* Card Image Area: Real Photo or Dark Silhouette */}
                  <View style={styles.cardMediaBox}>
                    {isUnlocked && animal.image_url ? (
                      <Image
                        source={{ uri: animal.image_url }}
                        style={styles.cardImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.lockedSilhouetteBox}>
                        <Ionicons name="finger-print-outline" size={36} color="#334155" />
                        <Text style={styles.lockedHintText}>NON ACQUISITO</Text>
                      </View>
                    )}
                    <View style={styles.dexTagOverlay}>
                      <Text style={styles.dexTagText}>#{animal.dex_number}</Text>
                    </View>
                    {isUnlocked && (
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-sharp" size={12} color="#10B981" />
                      </View>
                    )}
                  </View>

                  {/* Card Details */}
                  <View style={styles.cardBody}>
                    <Text
                      style={[
                        styles.cardName,
                        !isUnlocked && styles.cardNameLocked,
                      ]}
                      numberOfLines={1}>
                      {isUnlocked ? animal.name : '???'}
                    </Text>

                    <Text style={styles.cardCategory} numberOfLines={1}>
                      {animal.category}
                    </Text>

                    <View style={styles.cardFooter}>
                      <Text style={styles.continentLabel}>
                        {animal.continent_name.toUpperCase()}
                      </Text>
                      {isUnlocked && (
                        <Text style={styles.rarityLabel}>{animal.rarity.toUpperCase()}</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Animal Biometric Dossier Modal */}
      <Modal visible={!!selectedAnimal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.dossierCard}>
            {selectedAnimal && (
              <>
                <View style={styles.dossierHeader}>
                  <View style={styles.dossierDexBadge}>
                    <Text style={styles.dossierDexText}>
                      DEX #{selectedAnimal.dex_number}
                    </Text>
                  </View>
                  <Text style={styles.dossierStatus}>
                    {selectedAnimal.is_unlocked
                      ? 'REGISTRAZIONE CONFERMATA'
                      : 'ESEMPLARE NON PRESENTE NEL DEX'}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedAnimal(null)}>
                    <Ionicons name="close" size={22} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                {/* Dossier Image */}
                <View style={styles.dossierImageBox}>
                  {selectedAnimal.is_unlocked && selectedAnimal.image_url ? (
                    <Image
                      source={{ uri: selectedAnimal.image_url }}
                      style={styles.dossierImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.dossierImageFallback}>
                      <Ionicons name="scan-outline" size={48} color="#475569" />
                      <Text style={styles.dossierImageFallbackText}>
                        Inquadra questo animale dal vivo per archiviarlo
                      </Text>
                    </View>
                  )}
                </View>

                {/* Dossier Specs */}
                <View style={styles.dossierBody}>
                  <Text style={styles.dossierTitle}>
                    {selectedAnimal.is_unlocked ? selectedAnimal.name : 'SPECIE NON ANCORA SBLOCCATA'}
                  </Text>
                  <Text style={styles.dossierScientific}>
                    {selectedAnimal.is_unlocked
                      ? selectedAnimal.scientific_name
                      : `Categoria presunta: ${selectedAnimal.category}`}
                  </Text>

                  {selectedAnimal.is_unlocked && (
                    <>
                      <View style={styles.statGrid}>
                        <View style={styles.statBox}>
                          <Text style={styles.statLabel}>ALTEZZA</Text>
                          <Text style={styles.statVal}>{selectedAnimal.height}</Text>
                        </View>
                        <View style={styles.statBox}>
                          <Text style={styles.statLabel}>PESO</Text>
                          <Text style={styles.statVal}>{selectedAnimal.weight}</Text>
                        </View>
                        <View style={styles.statBox}>
                          <Text style={styles.statLabel}>RARITÀ</Text>
                          <Text style={[styles.statVal, { color: '#FBBF24' }]}>
                            {selectedAnimal.rarity}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.dossierLore}>
                        <Text style={styles.loreText}>{selectedAnimal.description}</Text>
                      </View>
                    </>
                  )}

                  {!selectedAnimal.is_unlocked && (
                    <TouchableOpacity
                      style={styles.scanTargetBtn}
                      onPress={() => {
                        setSelectedAnimal(null);
                        router.push('/');
                      }}>
                      <Ionicons name="camera-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.scanTargetBtnText}>AVVIA BIO-SCANNER</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: DexTheme.colors.pokedexRed,
  },
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  filterBar: {
    backgroundColor: '#0F172A',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  filterScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  continentChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1E293B',
  },
  continentChipActive: {
    backgroundColor: DexTheme.colors.pokemonBlue,
    borderColor: '#38BDF8',
  },
  continentChipText: {
    color: '#94A3B8',
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  continentChipTextActive: {
    color: '#FFFFFF',
  },
  progressBezel: {
    backgroundColor: '#111827',
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressTitle: {
    color: '#64748B',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  progressValue: {
    color: '#10B981',
    fontSize: 10.5,
    fontWeight: '900',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#1F2937',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#111827',
    marginHorizontal: 12,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 11.5,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    paddingBottom: 24,
    gap: 10,
  },
  animalCard: {
    width: '48%',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: '#111827',
  },
  cardUnlocked: {
    borderColor: '#334155',
  },
  cardLocked: {
    borderColor: '#1F2937',
    opacity: 0.8,
  },
  cardMediaBox: {
    width: '100%',
    height: 110,
    backgroundColor: '#0F172A',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  lockedSilhouetteBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  lockedHintText: {
    color: '#475569',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dexTagOverlay: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dexTagText: {
    color: '#00E5FF',
    fontSize: 9.5,
    fontWeight: '900',
  },
  verifiedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 4,
    padding: 3,
  },
  cardBody: {
    padding: 8,
  },
  cardName: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12.5,
  },
  cardNameLocked: {
    color: '#64748B',
  },
  cardCategory: {
    color: '#94A3B8',
    fontSize: 9.5,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 4,
  },
  continentLabel: {
    color: '#38BDF8',
    fontSize: 8.5,
    fontWeight: '800',
  },
  rarityLabel: {
    color: '#FBBF24',
    fontSize: 8.5,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dossierCard: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  dossierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#1E293B',
  },
  dossierDexBadge: {
    backgroundColor: DexTheme.colors.pokedexRed,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dossierDexText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 10,
  },
  dossierStatus: {
    color: '#94A3B8',
    fontSize: 9.5,
    fontWeight: '700',
  },
  dossierImageBox: {
    width: '100%',
    height: 180,
    backgroundColor: '#0B0F19',
  },
  dossierImage: {
    width: '100%',
    height: '100%',
  },
  dossierImageFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 16,
  },
  dossierImageFallbackText: {
    color: '#64748B',
    fontSize: 11,
    textAlign: 'center',
  },
  dossierBody: {
    padding: 14,
  },
  dossierTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  dossierScientific: {
    color: '#94A3B8',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
    marginBottom: 10,
  },
  statGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  statLabel: {
    color: '#64748B',
    fontSize: 8.5,
    fontWeight: '800',
    marginBottom: 1,
  },
  statVal: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  dossierLore: {
    backgroundColor: '#1E293B',
    padding: 10,
    borderRadius: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#10B981',
  },
  loreText: {
    color: '#CBD5E1',
    fontSize: 11,
    lineHeight: 16,
  },
  scanTargetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: DexTheme.colors.pokemonBlue,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  scanTargetBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.8,
  },
});
