import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

type Gender = 'male' | 'female' | 'neutral';

interface Persona3DAvatarProps {
  gender: Gender;
  /** Approximate age in years to subtly hint at look (hair color). Optional. */
  age?: number;
  /** Skin tone variation seed (e.g. persona id) for slight variety */
  seed?: string;
}

// Simple seeded hash for stable per-persona variation
function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function CharacterMesh({ gender, age = 30, seed = '' }: Persona3DAvatarProps) {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current) return;
    // Gentle idle rotation
    group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.25;
  });

  const { skin, hair, shirt, accent, hasGlasses, hasBeard, hasEarring, hasFreckles, glassesColor } = useMemo(() => {
    const h = hashSeed(seed || gender);
    const skinTones = ['#f5cfa0', '#e8b48a', '#d29575', '#a87253', '#7a4c34'];
    const skin = skinTones[h % skinTones.length];

    const isOlder = age >= 55;
    const isYoung = age < 25;
    const youngHair = ['#2b1d14', '#3d2914', '#5c3a1e', '#1a1a1a', '#8b5a2b'];
    const olderHair = ['#9aa0a6', '#bdbdbd', '#e0e0e0'];
    const hair = (isOlder ? olderHair : youngHair)[h % (isOlder ? olderHair.length : youngHair.length)];

    let shirt: string;
    let accent: string;
    if (gender === 'female') {
      const femShirts = ['#ec4899', '#f43f5e', '#a855f7', '#f59e0b', '#10b981'];
      shirt = femShirts[(h >> 3) % femShirts.length];
      accent = '#ffffff';
    } else if (gender === 'male') {
      const malShirts = ['#3b82f6', '#1e40af', '#0ea5e9', '#14b8a6', '#475569'];
      shirt = malShirts[(h >> 3) % malShirts.length];
      accent = '#ffffff';
    } else {
      shirt = '#6366f1';
      accent = '#ffffff';
    }

    // Trait variations based on seed bits + persona attributes
    // Glasses more likely on older personas
    const glassesRoll = (h >> 5) % 100;
    const hasGlasses = isOlder ? glassesRoll < 55 : glassesRoll < 30;
    // Beard only on male personas, more likely if older
    const beardRoll = (h >> 7) % 100;
    const hasBeard = gender === 'male' && (isOlder ? beardRoll < 70 : beardRoll < 35);
    // Earring more likely on female / younger
    const earringRoll = (h >> 9) % 100;
    const hasEarring = gender === 'female' ? earringRoll < 65 : (isYoung ? earringRoll < 25 : earringRoll < 8);
    // Freckles for variety on lighter skin tones
    const frecklesRoll = (h >> 11) % 100;
    const hasFreckles = (h % skinTones.length) < 2 && frecklesRoll < 35;
    // Glasses color variation
    const glassesColors = ['#1a1a1a', '#3d2914', '#7a4c34', '#475569', '#a16207'];
    const glassesColor = glassesColors[(h >> 13) % glassesColors.length];

    return { skin, hair, shirt, accent, hasGlasses, hasBeard, hasEarring, hasFreckles, glassesColor };
  }, [gender, age, seed]);

  const isFemale = gender === 'female';

  return (
    <group ref={group} position={[0, -0.6, 0]}>
      {/* Body / shirt */}
      <mesh position={[0, 0.05, 0]} castShadow>
        <capsuleGeometry args={[0.42, 0.5, 8, 16]} />
        <meshStandardMaterial color={shirt} roughness={0.6} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.12, 0.12, 16]} />
        <meshStandardMaterial color={skin} roughness={0.7} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.82, 0]} castShadow>
        <sphereGeometry args={[0.32, 32, 32]} />
        <meshStandardMaterial color={skin} roughness={0.65} />
      </mesh>

      {/* Hair — top cap */}
      <mesh position={[0, 0.97, isFemale ? -0.02 : 0]} castShadow>
        <sphereGeometry
          args={[0.34, 32, 32, 0, Math.PI * 2, 0, isFemale ? Math.PI / 1.6 : Math.PI / 2.2]}
        />
        <meshStandardMaterial color={hair} roughness={0.8} />
      </mesh>

      {/* Female longer hair on the sides/back */}
      {isFemale && (
        <mesh position={[0, 0.7, -0.05]} castShadow>
          <sphereGeometry args={[0.36, 32, 32, 0, Math.PI * 2, Math.PI / 2.5, Math.PI / 2]} />
          <meshStandardMaterial color={hair} roughness={0.8} />
        </mesh>
      )}

      {/* Eyes */}
      <mesh position={[-0.1, 0.85, 0.28]}>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0.1, 0.85, 0.28]}>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Smile (small accent) */}
      <mesh position={[0, 0.74, 0.3]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.05, 0.012, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#a8324a" />
      </mesh>

      {/* Shirt collar accent */}
      <mesh position={[0, 0.42, 0.35]}>
        <boxGeometry args={[0.18, 0.04, 0.02]} />
        <meshStandardMaterial color={accent} />
      </mesh>
    </group>
  );
}

export default function Persona3DAvatar({ gender, age, seed }: Persona3DAvatarProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 0.2, 2.4], fov: 35 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[2, 3, 2]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
      />
      <directionalLight position={[-2, 1, -1]} intensity={0.3} color="#ffd9e8" />
      <Suspense fallback={null}>
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.4}>
          <CharacterMesh gender={gender} age={age} seed={seed} />
        </Float>
        <ContactShadows
          position={[0, -0.95, 0]}
          opacity={0.35}
          scale={3}
          blur={2.5}
          far={1.5}
        />
      </Suspense>
    </Canvas>
  );
}
