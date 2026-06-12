import type { ModelKey } from './anatomyModels'

export const SYSTEM_BASE_COLOR: Partial<Record<ModelKey, string>> = {
  skeleton:           '#D4C8A8',
  cardiovascular:     '#C41E1E',
  muscular:           '#B84020',
  muscularInsertions: '#A03515',
  nervous:            '#DFB822',
  visceral:           '#C05878',
  lymphoid:           '#7A38B0',
  joints:             '#4A9E68',
  crossSection:       '#3A78C0',
  referenceLines:     '#38E0C3',
  bodyRegions:        '#38C0B0',
  takeAPicture:       '#888888',
}

const MESH_COLOUR_RULES: Array<{ test: RegExp; color: string }> = [
  // Heart & vessels
  { test: /heart|cor\b|cardiac|ventricl|atri[au]/i,         color: '#C01515' },
  { test: /aorta/i,                                          color: '#DD2020' },
  { test: /artery|arteria|arterial/i,                        color: '#DD2828' },
  { test: /vein|vena\b|venous|sinus/i,                       color: '#2A3EA0' },
  { test: /capillar/i,                                       color: '#DD3333' },
  { test: /coronary/i,                                       color: '#BB1515' },
  // Lungs & airways
  { test: /lung|pulmon/i,                                    color: '#F07090' },
  { test: /trachea|bronch/i,                                 color: '#88AACC' },
  { test: /diaphragm/i,                                      color: '#CC8866' },
  // Abdominal organs
  { test: /liver|hepar/i,                                    color: '#7B3020' },
  { test: /kidney|renal|ren\b/i,                             color: '#9A3525' },
  { test: /stomach|gastr/i,                                  color: '#C07050' },
  { test: /pancrea/i,                                        color: '#E0A860' },
  { test: /spleen|lien/i,                                    color: '#8A3898' },
  { test: /intestin|duoden|jejun|ileum|cecum|colon|rectum/i, color: '#C88060' },
  { test: /bladder|vesic/i,                                  color: '#8888CC' },
  { test: /uterus|ovary|prostat/i,                           color: '#E070A0' },
  { test: /thyroid/i,                                        color: '#55AA80' },
  { test: /adrenal/i,                                        color: '#AAAA44' },
  // Skeleton
  { test: /skull|cranium|mandible|maxilla/i,                 color: '#E0D8C0' },
  { test: /vertebr|spine|sacrum|coccyx/i,                    color: '#D0C8A8' },
  { test: /rib|cost[ae]/i,                                   color: '#D4C8A0' },
  { test: /femur|humerus|tibia|fibula|radius|ulna/i,         color: '#C8C0A0' },
  { test: /pelvis|acetabul|ilium|ischium|pubis/i,            color: '#CCC4A4' },
  { test: /scapula|clavicle/i,                               color: '#D0C8A8' },
  { test: /patella|carpal|tarsal|phalanx|metacarp/i,         color: '#C8C0A0' },
  { test: /sternum/i,                                        color: '#D0C8A8' },
  // Muscles
  { test: /deltoid/i,                                        color: '#C04820' },
  { test: /bicep/i,                                          color: '#B84020' },
  { test: /tricep/i,                                         color: '#B03818' },
  { test: /pector/i,                                         color: '#C05020' },
  { test: /trapez/i,                                         color: '#B84030' },
  { test: /latissim/i,                                       color: '#B03828' },
  { test: /quadricep/i,                                      color: '#C24828' },
  { test: /hamstr/i,                                         color: '#B84030' },
  { test: /gastrocnem|soleus/i,                              color: '#C04828' },
  { test: /gluteu/i,                                         color: '#BC4428' },
  { test: /rectus.abdom/i,                                   color: '#C24830' },
  // Nervous system
  { test: /brain|encephal|cerebrum|cortex/i,                 color: '#F0D060' },
  { test: /cerebellum/i,                                     color: '#E8C840' },
  { test: /brainstem|medulla|pons|midbrain/i,                color: '#E0C038' },
  { test: /spinal.cord/i,                                    color: '#E0B830' },
  { test: /nerve|nervus|plexus|ganglion/i,                   color: '#F0D848' },
  // Lymphatic
  { test: /lymph.node/i,                                     color: '#9050C0' },
  { test: /thymus/i,                                         color: '#A060CC' },
  { test: /lymphatic.vessel/i,                               color: '#8040B0' },
  // Joints
  { test: /cartilage|meniscus/i,                             color: '#88CCA0' },
  { test: /ligament/i,                                       color: '#A0C870' },
  { test: /tendon/i,                                         color: '#C8D080' },
  { test: /joint|articulat/i,                                color: '#4A9E68' },
]

export function resolveColor(meshName: string, modelKey: ModelKey): string {
  for (const rule of MESH_COLOUR_RULES) {
    if (rule.test.test(meshName)) return rule.color
  }
  return SYSTEM_BASE_COLOR[modelKey] ?? '#B0A898'
}
