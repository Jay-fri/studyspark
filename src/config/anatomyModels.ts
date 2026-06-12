// In dev: requests go through the Vite proxy (/r2-models → R2 bucket),
// which bypasses CORS since the request is server-to-server.
// In prod: direct R2 URL — requires CORS configured on the R2 bucket
// (Cloudflare dashboard → R2 → bucket → Settings → CORS → allow your domain).
const R2 = import.meta.env.DEV
  ? '/r2-models'
  : 'https://pub-b501ce6fd8de4bf4938674fb9e008ad0.r2.dev'

export const GLB_MODELS = {
  skeleton:           `${R2}/skelton.glb`,
  cardiovascular:     `${R2}/cardiovascular-system.glb`,
  muscular:           `${R2}/muscular-system.glb`,
  muscularInsertions: `${R2}/muscular-insertions.glb`,
  nervous:            `${R2}/nervous-system-and-sense-organs.glb`,
  visceral:           `${R2}/visceral-system.glb`,
  lymphoid:           `${R2}/lymphoid-organs.glb`,
  joints:             `${R2}/joints.glb`,
  crossSection:       `${R2}/cross-section-planes.glb`,
  referenceLines:     `${R2}/references-lines-reference-planes-movements.glb`,
  bodyRegions:        `${R2}/regions-of-human-body.glb`,
  takeAPicture:       `${R2}/take-a-picture.glb`,
} as const

export type ModelKey = keyof typeof GLB_MODELS

export interface LayerGroupDef {
  label:    string
  icon:     string
  color:    string
  models:   ModelKey[]
  priority: number
}

export const LAYER_GROUPS: Record<string, LayerGroupDef> = {
  skeleton: {
    label: 'Skeleton', icon: '🦴', color: '#E8E8E8',
    models: ['skeleton'], priority: 1,
  },
  cardiovascular: {
    label: 'Cardiovascular', icon: '❤️', color: '#EF4444',
    models: ['cardiovascular'], priority: 2,
  },
  muscular: {
    label: 'Muscles', icon: '💪', color: '#F97316',
    models: ['muscular', 'muscularInsertions'], priority: 3,
  },
  visceral: {
    label: 'Organs', icon: '🫁', color: '#EC4899',
    models: ['visceral'], priority: 3,
  },
  nervous: {
    label: 'Nervous System', icon: '🧠', color: '#EAB308',
    models: ['nervous'], priority: 4,
  },
  lymphoid: {
    label: 'Lymphatic', icon: '🩸', color: '#A855F7',
    models: ['lymphoid'], priority: 4,
  },
  reference: {
    label: 'Reference', icon: '📐', color: '#6366F1',
    models: ['joints', 'crossSection', 'referenceLines', 'bodyRegions'], priority: 5,
  },
}

export const LAYER_GROUP_KEYS = Object.keys(LAYER_GROUPS)
