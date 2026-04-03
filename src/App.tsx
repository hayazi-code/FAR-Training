import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Edges, Html, Line, OrbitControls, Sky } from '@react-three/drei';
import * as THREE from 'three';

type Language = 'en' | 'es' | 'fr' | 'zh';
type DensityPreset =
  | 'custom'
  | 'detachedHouse'
  | 'lowResidential'
  | 'mediumResidential'
  | 'higherResidential';
type WarningLevel = 'info' | 'warning' | 'danger';
type WarningKey =
  | 'noEnvelope'
  | 'coverageClipped'
  | 'heightLimitReached'
  | 'baseAboveLimit'
  | 'upperTooSlim'
  | 'setbackDominant';
type UnitKey = 'feet' | 'squareFeet' | 'percent' | 'ratio' | 'none';
type NumericSettingKey =
  | 'lotArea'
  | 'lotWidth'
  | 'lotCoverage'
  | 'far'
  | 'heightLimit'
  | 'baseHeight'
  | 'frontSetback'
  | 'rearSetback'
  | 'sideSetback';
type ToggleSettingKey =
  | 'showSetbacks'
  | 'showMeasurements'
  | 'showTrees'
  | 'showContext'
  | 'realisticFacade';

interface ExplorerSettings {
  lotArea: number;
  lotWidth: number;
  lotCoverage: number;
  far: number;
  heightLimit: number;
  baseHeight: number;
  frontSetback: number;
  rearSetback: number;
  sideSetback: number;
  showSetbacks: boolean;
  showMeasurements: boolean;
  showTrees: boolean;
  showContext: boolean;
  realisticFacade: boolean;
}

interface TranslationSet {
  brandKicker: string;
  title: string;
  subtitle: string;
  language: string;
  density: string;
  custom: string;
  detachedHouse: string;
  lowResidential: string;
  mediumResidential: string;
  higherResidential: string;
  presetNote: string;
  parcelSection: string;
  parcelCopy: string;
  envelopeSection: string;
  envelopeCopy: string;
  displaySection: string;
  displayCopy: string;
  liveMetrics: string;
  warnings: string;
  noWarnings: string;
  quickNotes: string;
  disclaimerTitle: string;
  disclaimerText: string;
  sceneTitle: string;
  sceneLabel: string;
  exportSnapshot: string;
  shareSettings: string;
  shareHint: string;
  collapseSidebar: string;
  expandSidebar: string;
  lotArea: string;
  lotAreaHint: string;
  lotWidth: string;
  lotWidthHint: string;
  lotCoverage: string;
  lotCoverageHint: string;
  far: string;
  farHint: string;
  heightLimit: string;
  heightLimitHint: string;
  baseHeight: string;
  baseHeightHint: string;
  frontSetback: string;
  frontSetbackHint: string;
  rearSetback: string;
  rearSetbackHint: string;
  sideSetback: string;
  sideSetbackHint: string;
  showSetbacks: string;
  showSetbacksHint: string;
  showMeasurements: string;
  showMeasurementsHint: string;
  showTrees: string;
  showTreesHint: string;
  showContext: string;
  showContextHint: string;
  realisticFacade: string;
  realisticFacadeHint: string;
  lotDepth: string;
  footprintArea: string;
  targetFloorArea: string;
  achievedFar: string;
  estimatedStories: string;
  openSpace: string;
  builtHeight: string;
  envelopeArea: string;
  presetApproximationNote: string;
  envelopeFootnote: string;
  contextNote: string;
  teachingNote: string;
  statusCopied: string;
  statusCopyFailed: string;
  statusSnapshotSaved: string;
  warningNoEnvelope: string;
  warningCoverageClipped: string;
  warningHeightLimitReached: string;
  warningBaseAboveLimit: string;
  warningUpperTooSlim: string;
  warningSetbackDominant: string;
  buildingWidth: string;
  buildingDepth: string;
  feet: string;
  squareFeet: string;
  percent: string;
  ratio: string;
}

interface WarningMessage {
  key: WarningKey;
  level: WarningLevel;
}

interface MassingData {
  lotDepth: number;
  lotWidth: number;
  lotArea: number;
  envelopeWidth: number;
  envelopeDepth: number;
  envelopeArea: number;
  footprintWidth: number;
  footprintDepth: number;
  footprintArea: number;
  footprintCenterZ: number;
  upperWidth: number;
  upperDepth: number;
  upperArea: number;
  upperCenterZ: number;
  baseBuiltHeight: number;
  upperBuiltHeight: number;
  totalHeight: number;
  targetFloorArea: number;
  achievedFloorArea: number;
  achievedFar: number;
  estimatedStories: number;
  openSpaceArea: number;
  warnings: WarningMessage[];
}

interface NumericFieldConfig {
  key: NumericSettingKey;
  labelKey: keyof TranslationSet;
  hintKey: keyof TranslationSet;
  min: number;
  max: number;
  step: number;
  unit: UnitKey;
  digits?: number;
}

interface ToggleFieldConfig {
  key: ToggleSettingKey;
  labelKey: keyof TranslationSet;
  hintKey: keyof TranslationSet;
}

type Point3 = [number, number, number];

const floorHeight = 11;

const localeByLanguage: Record<Language, string> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  zh: 'zh-CN',
};

const translations: Record<Language, TranslationSet> = {
  en: {
    brandKicker: 'Educational zoning massing workspace',
    title: 'FAR Explorer',
    subtitle:
      'Compare lot width, FAR, setbacks, and lot coverage in a live 3D study. This tool teaches urban form tradeoffs and does not replace zoning review.',
    language: 'Language',
    density: 'Preset',
    custom: 'Custom',
    detachedHouse: 'Detached House (R1-like)',
    lowResidential: 'Low Residential (R5/R6-like)',
    mediumResidential: 'Medium Residential (R7A-like)',
    higherResidential: 'Higher Residential (R9A-like)',
    presetNote:
      'Preset names are illustrative teaching shortcuts only. They do not reproduce full NYC zoning rules or compliance outcomes.',
    parcelSection: 'Parcel',
    parcelCopy: 'Set the site size and intensity targets that establish the development frame.',
    envelopeSection: 'Envelope',
    envelopeCopy: 'Adjust the street wall, setbacks, and height cap that shape the massing envelope.',
    displaySection: 'Display',
    displayCopy: 'Turn visual layers on or off without changing the underlying assumptions.',
    liveMetrics: 'Summary metrics',
    warnings: 'Warnings',
    noWarnings: 'No major conflicts under these simplified assumptions.',
    quickNotes: 'Notes',
    disclaimerTitle: 'Educational disclaimer',
    disclaimerText:
      'This visualization is intentionally simplified. It does not interpret full zoning text, overlays, fire access, parking, egress, or discretionary review. Always verify with official code sources and qualified professionals.',
    sceneTitle: '3D massing workspace',
    sceneLabel: 'Live scene',
    exportSnapshot: 'Export snapshot',
    shareSettings: 'Share settings',
    shareHint: 'Shared links preserve the current feet-based parcel, envelope, and display settings.',
    collapseSidebar: 'Collapse sidebar',
    expandSidebar: 'Expand sidebar',
    lotArea: 'Lot area',
    lotAreaHint: 'Total parcel area used to derive lot depth from street frontage.',
    lotWidth: 'Lot width',
    lotWidthHint: 'Street-facing lot frontage.',
    lotCoverage: 'Lot coverage',
    lotCoverageHint: 'Percent of the lot occupied by the base footprint.',
    far: 'FAR',
    farHint: 'Target floor area ratio used to estimate total building area.',
    heightLimit: 'Height limit',
    heightLimitHint: 'Maximum building height for this simplified study.',
    baseHeight: 'Base height',
    baseHeightHint: 'Street wall or podium height before upper setbacks begin.',
    frontSetback: 'Front setback',
    frontSetbackHint: 'Open area kept between the street edge and the building.',
    rearSetback: 'Rear setback',
    rearSetbackHint: 'Open yard kept at the back of the lot.',
    sideSetback: 'Side setback',
    sideSetbackHint: 'Open space kept along each side of the lot.',
    showSetbacks: 'Show stepped massing',
    showSetbacksHint: 'Allow the upper mass to step inward when setbacks are enabled.',
    showMeasurements: 'Show measurements',
    showMeasurementsHint: 'Display restrained dimension lines for key teaching dimensions.',
    showTrees: 'Show trees',
    showTreesHint: 'Scatter simple trees in the open-space portions of the lot.',
    showContext: 'Show context',
    showContextHint: 'Add neighboring ghost buildings to the sides and rear only.',
    realisticFacade: 'Facade detail',
    realisticFacadeHint: 'Use procedural windows and bands instead of stretched facade textures.',
    lotDepth: 'Lot depth',
    footprintArea: 'Footprint area',
    targetFloorArea: 'Target floor area',
    achievedFar: 'Achieved FAR',
    estimatedStories: 'Approx. stories',
    openSpace: 'Open space',
    builtHeight: 'Total height',
    envelopeArea: 'Envelope area',
    presetApproximationNote:
      'These zoning-style presets are educational approximations, not code-calibrated district simulations.',
    envelopeFootnote: 'Ground-level buildable area after lot-line setbacks are applied.',
    contextNote: 'Context buildings stay to the sides and rear so the front street remains clear.',
    teachingNote: 'Facade detail is procedural, so the mass scales cleanly without stretched textures.',
    statusCopied: 'Share link copied.',
    statusCopyFailed: 'Automatic copy failed. You can still copy the URL from the address bar.',
    statusSnapshotSaved: 'Snapshot downloaded.',
    warningNoEnvelope: 'Setbacks remove the entire buildable envelope.',
    warningCoverageClipped:
      'Requested lot coverage exceeds the setback-limited footprint, so the base mass is clipped.',
    warningHeightLimitReached:
      'The target FAR cannot be fully expressed before the height limit is reached.',
    warningBaseAboveLimit: 'Base height is taller than the overall height limit.',
    warningUpperTooSlim:
      'Upper step-backs leave a very narrow upper plate. Reduce setbacks or base height for a clearer mass.',
    warningSetbackDominant:
      'Setbacks consume most of the lot width or depth, leaving very little compositional flexibility.',
    buildingWidth: 'Building width',
    buildingDepth: 'Building depth',
    feet: 'ft',
    squareFeet: 'sf',
    percent: '%',
    ratio: 'FAR',
  },
  es: {
    brandKicker: 'Herramienta educativa de masa y zonificacion',
    title: 'FAR Explorer',
    subtitle:
      'Compara ancho del lote, FAR, retiros y cobertura con una escena 3D en vivo. La herramienta explica relaciones urbanas y no sustituye una revision normativa.',
    language: 'Idioma',
    density: 'Preset',
    custom: 'Custom',
    detachedHouse: 'Detached House (R1-like)',
    lowResidential: 'Low Residential (R5/R6-like)',
    mediumResidential: 'Medium Residential (R7A-like)',
    higherResidential: 'Higher Residential (R9A-like)',
    presetNote:
      'Los presets son atajos educativos ilustrativos. No reproducen de forma completa las reglas de zonificacion de NYC ni un analisis de cumplimiento.',
    parcelSection: 'Parcela',
    parcelCopy: 'Configura el lote y los objetivos de intensidad que estructuran la prueba volumetrica.',
    envelopeSection: 'Envolvente',
    envelopeCopy: 'Ajusta altura base, retiros y limite de altura para definir la envolvente.',
    displaySection: 'Visualizacion',
    displayCopy: 'Activa o desactiva capas visuales sin cambiar la logica principal.',
    liveMetrics: 'Metricas',
    warnings: 'Advertencias',
    noWarnings: 'No aparecen conflictos importantes bajo estas suposiciones simplificadas.',
    quickNotes: 'Notas',
    disclaimerTitle: 'Aviso educativo',
    disclaimerText:
      'Esta visualizacion es intencionalmente simplificada. No interpreta texto normativo completo, superposiciones, estacionamiento, evacuacion, acceso de bomberos ni revision discrecional. Verifica siempre con fuentes oficiales y profesionales calificados.',
    sceneTitle: 'Espacio 3D de masa',
    sceneLabel: 'Escena',
    exportSnapshot: 'Exportar imagen',
    shareSettings: 'Compartir ajustes',
    shareHint: 'Los enlaces compartidos conservan los valores actuales en pies y pies cuadrados.',
    collapseSidebar: 'Contraer panel',
    expandSidebar: 'Expandir panel',
    lotArea: 'Area del lote',
    lotAreaHint: 'Superficie total de la parcela para derivar la profundidad desde el frente.',
    lotWidth: 'Ancho del lote',
    lotWidthHint: 'Frente del lote hacia la calle.',
    lotCoverage: 'Cobertura del lote',
    lotCoverageHint: 'Porcentaje del lote ocupado por la base del edificio.',
    far: 'FAR',
    farHint: 'Relacion de area usada para estimar el area total construida.',
    heightLimit: 'Limite de altura',
    heightLimitHint: 'Altura maxima del edificio en esta version simplificada.',
    baseHeight: 'Altura de base',
    baseHeightHint: 'Altura del podium antes del retranqueo superior.',
    frontSetback: 'Retiro frontal',
    frontSetbackHint: 'Espacio abierto entre la calle y el edificio.',
    rearSetback: 'Retiro posterior',
    rearSetbackHint: 'Patio abierto en la parte trasera del lote.',
    sideSetback: 'Retiro lateral',
    sideSetbackHint: 'Espacio abierto conservado en cada lado.',
    showSetbacks: 'Mostrar masa escalonada',
    showSetbacksHint: 'Permite que la masa superior se retraiga cuando hay retiros.',
    showMeasurements: 'Mostrar medidas',
    showMeasurementsHint: 'Muestra lineas de cota discretas para dimensiones clave.',
    showTrees: 'Mostrar arboles',
    showTreesHint: 'Distribuye arboles simples en las areas libres del lote.',
    showContext: 'Mostrar contexto',
    showContextHint: 'Agrega edificios fantasma a los lados y al fondo solamente.',
    realisticFacade: 'Detalle de fachada',
    realisticFacadeHint: 'Usa ventanas procedurales y evita texturas estiradas.',
    lotDepth: 'Profundidad',
    footprintArea: 'Huella',
    targetFloorArea: 'Area objetivo',
    achievedFar: 'FAR logrado',
    estimatedStories: 'Pisos aprox.',
    openSpace: 'Espacio libre',
    builtHeight: 'Altura total',
    envelopeArea: 'Area envolvente',
    presetApproximationNote:
      'Estos presets inspirados en zonas son aproximaciones educativas y no simulaciones normativas calibradas.',
    envelopeFootnote: 'Area edificable en planta baja despues de aplicar retiros.',
    contextNote: 'Los edificios de contexto quedan a los lados y al fondo para dejar libre la calle frontal.',
    teachingNote: 'La fachada es procedural y evita deformaciones cuando cambia la masa.',
    statusCopied: 'Enlace copiado.',
    statusCopyFailed: 'No se pudo copiar automaticamente. Aun puedes copiar la URL manualmente.',
    statusSnapshotSaved: 'Imagen descargada.',
    warningNoEnvelope: 'Los retiros eliminan toda la envolvente edificable.',
    warningCoverageClipped:
      'La cobertura solicitada supera la huella permitida por los retiros, por eso la base se recorta.',
    warningHeightLimitReached:
      'El FAR objetivo no puede expresarse por completo antes de alcanzar el limite de altura.',
    warningBaseAboveLimit: 'La altura de base supera el limite general de altura.',
    warningUpperTooSlim:
      'Los retranqueos dejan una placa superior muy angosta. Reduce retiros o altura de base para una masa mas clara.',
    warningSetbackDominant:
      'Los retiros consumen gran parte del ancho o la profundidad del lote y reducen la flexibilidad del volumen.',
    buildingWidth: 'Ancho del edificio',
    buildingDepth: 'Profundidad del edificio',
    feet: 'ft',
    squareFeet: 'sf',
    percent: '%',
    ratio: 'FAR',
  },
  fr: {
    brandKicker: 'Outil pedagogique de volumetrie et zonage',
    title: 'FAR Explorer',
    subtitle:
      'Comparez largeur de terrain, FAR, retraits et emprise dans une scene 3D en direct. L outil explique les compromis de forme urbaine sans remplacer une analyse reglementaire.',
    language: 'Langue',
    density: 'Preset',
    custom: 'Custom',
    detachedHouse: 'Detached House (R1-like)',
    lowResidential: 'Low Residential (R5/R6-like)',
    mediumResidential: 'Medium Residential (R7A-like)',
    higherResidential: 'Higher Residential (R9A-like)',
    presetNote:
      'Ces presets sont des raccourcis pedagogiques illustratifs. Ils ne reproduisent pas l ensemble des regles de zonage de NYC ni un controle de conformite.',
    parcelSection: 'Terrain',
    parcelCopy: 'Reglez la parcelle et les objectifs d intensite qui cadrent l etude.',
    envelopeSection: 'Envelope',
    envelopeCopy: 'Ajustez socle, retraits et limite de hauteur pour piloter l enveloppe.',
    displaySection: 'Affichage',
    displayCopy: 'Activez ou non les couches d interpretation visuelle.',
    liveMetrics: 'Metriques',
    warnings: 'Alertes',
    noWarnings: 'Aucun conflit majeur sous ces hypotheses simplifiees.',
    quickNotes: 'Notes',
    disclaimerTitle: 'Avertissement pedagogique',
    disclaimerText:
      'Cette visualisation est volontairement simplifiee. Elle n interprete pas le texte complet, les surcouches, le stationnement, l evacuation, l acces incendie ni la revue discretionnaire. Verifiez toujours avec des sources officielles et des professionnels qualifies.',
    sceneTitle: 'Espace 3D de volumetrie',
    sceneLabel: 'Scene',
    exportSnapshot: 'Exporter une image',
    shareSettings: 'Partager les reglages',
    shareHint: 'Les liens partages conservent les valeurs actuelles en pieds et en pieds carres.',
    collapseSidebar: 'Replier le panneau',
    expandSidebar: 'Deplier le panneau',
    lotArea: 'Surface du terrain',
    lotAreaHint: 'Surface totale de la parcelle pour deduire la profondeur depuis la facade.',
    lotWidth: 'Largeur du terrain',
    lotWidthHint: 'Facade sur rue du terrain.',
    lotCoverage: 'Emprise au sol',
    lotCoverageHint: 'Pourcentage du terrain occupe par l emprise de base.',
    far: 'FAR',
    farHint: 'Coefficient de surface servant a estimer la surface totale construite.',
    heightLimit: 'Limite de hauteur',
    heightLimitHint: 'Hauteur maximale du batiment dans cette etude simplifiee.',
    baseHeight: 'Hauteur du socle',
    baseHeightHint: 'Hauteur du podium avant le retrait de la masse superieure.',
    frontSetback: 'Recul avant',
    frontSetbackHint: 'Espace libre entre la rue et le batiment.',
    rearSetback: 'Recul arriere',
    rearSetbackHint: 'Cour libre preservee a l arriere du terrain.',
    sideSetback: 'Recul lateral',
    sideSetbackHint: 'Espace libre conserve de chaque cote du terrain.',
    showSetbacks: 'Afficher la masse en retraits',
    showSetbacksHint: 'Permet a la masse haute de se resserrer quand les retraits sont actifs.',
    showMeasurements: 'Afficher les cotes',
    showMeasurementsHint: 'Affiche des lignes de cote fines pour les dimensions essentielles.',
    showTrees: 'Afficher les arbres',
    showTreesHint: 'Place quelques arbres simples dans les espaces libres du terrain.',
    showContext: 'Afficher le contexte',
    showContextHint: 'Ajoute des batiments fantomes sur les cotes et a l arriere seulement.',
    realisticFacade: 'Detail de facade',
    realisticFacadeHint: 'Utilise des fenetres procedurales au lieu de textures etirees.',
    lotDepth: 'Profondeur',
    footprintArea: 'Emprise',
    targetFloorArea: 'Surface cible',
    achievedFar: 'FAR atteint',
    estimatedStories: 'Etages approx.',
    openSpace: 'Espace libre',
    builtHeight: 'Hauteur totale',
    envelopeArea: 'Surface envelope',
    presetApproximationNote:
      'Ces presets inspires de zones sont des approximations pedagogiques et non des simulations reglementaires calibrees.',
    envelopeFootnote: 'Surface constructible au sol apres application des retraits.',
    contextNote: 'Les batiments fantomes restent sur les cotes et a l arriere pour garder la rue avant degagee.',
    teachingNote: 'Le detail de facade est procedural et evite les textures etirees quand la masse change.',
    statusCopied: 'Lien copie.',
    statusCopyFailed: 'Copie automatique impossible. Vous pouvez toujours copier l URL manuellement.',
    statusSnapshotSaved: 'Image telechargee.',
    warningNoEnvelope: 'Les retraits suppriment toute l enveloppe constructible.',
    warningCoverageClipped:
      'L emprise demandee depasse la surface permise par les retraits; le socle est donc reduit.',
    warningHeightLimitReached:
      'Le FAR cible ne peut pas etre entierement exprime avant d atteindre la limite de hauteur.',
    warningBaseAboveLimit: 'La hauteur du socle depasse la limite generale de hauteur.',
    warningUpperTooSlim:
      'Les retraits laissent une plaque superieure tres etroite. Reduisez les retraits ou la hauteur du socle.',
    warningSetbackDominant:
      'Les retraits consomment une grande partie de la largeur ou de la profondeur du terrain.',
    buildingWidth: 'Largeur du batiment',
    buildingDepth: 'Profondeur du batiment',
    feet: 'ft',
    squareFeet: 'sf',
    percent: '%',
    ratio: 'FAR',
  },
  zh: {
    brandKicker: '教学型分区与体量工作台',
    title: 'FAR Explorer',
    subtitle:
      '比较地块宽度、容积率、退线和覆盖率，并实时查看三维体量。这个工具用于教学展示，不是法规合规引擎。',
    language: '语言',
    density: '预设',
    custom: 'Custom',
    detachedHouse: 'Detached House (R1-like)',
    lowResidential: 'Low Residential (R5/R6-like)',
    mediumResidential: 'Medium Residential (R7A-like)',
    higherResidential: 'Higher Residential (R9A-like)',
    presetNote:
      '这些预设只是教学近似，不会完整复现 NYC 分区规则，也不是正式合规判断。',
    parcelSection: '地块',
    parcelCopy: '先设定地块规模与开发强度目标，形成基础开发框架。',
    envelopeSection: '体量边界',
    envelopeCopy: '调整基座高度、退线与总高限制，观察体量边界变化。',
    displaySection: '显示',
    displayCopy: '按需开关教学图层，不改变核心计算逻辑。',
    liveMetrics: '汇总指标',
    warnings: '提示',
    noWarnings: '在这些简化假设下，没有明显冲突。',
    quickNotes: '说明',
    disclaimerTitle: '教学免责声明',
    disclaimerText:
      '该可视化故意保持简化。它不会解释完整法规正文、叠加控制、停车、疏散、防火通道或自由裁量审查。请始终结合正式法规文本与专业顾问核对。',
    sceneTitle: '三维体量工作区',
    sceneLabel: '场景',
    exportSnapshot: '导出截图',
    shareSettings: '分享参数',
    shareHint: '分享链接会保留当前以英尺和平方英尺表示的参数设置。',
    collapseSidebar: '收起侧栏',
    expandSidebar: '展开侧栏',
    lotArea: '地块面积',
    lotAreaHint: '地块总面积，会结合临街宽度推导地块进深。',
    lotWidth: '地块宽度',
    lotWidthHint: '面向街道的一侧宽度。',
    lotCoverage: '覆盖率',
    lotCoverageHint: '允许被建筑底盘占据的地块百分比。',
    far: '容积率',
    farHint: '用于估算总建筑面积的目标 FAR。',
    heightLimit: '高度限制',
    heightLimitHint: '此简化模型中的建筑高度上限。',
    baseHeight: '基座高度',
    baseHeightHint: '上部退台开始之前的街墙或裙房高度。',
    frontSetback: '前退线',
    frontSetbackHint: '街道与建筑之间保留的开放距离。',
    rearSetback: '后退线',
    rearSetbackHint: '地块后部保留的开放庭院。',
    sideSetback: '侧退线',
    sideSetbackHint: '地块两侧保留的开放空间。',
    showSetbacks: '显示退台体量',
    showSetbacksHint: '启用后让上部体量向内收进。',
    showMeasurements: '显示尺寸',
    showMeasurementsHint: '显示简洁克制的关键尺寸线。',
    showTrees: '显示树木',
    showTreesHint: '在开放空间中放置简化树木。',
    showContext: '显示周边',
    showContextHint: '只在两侧和后方添加幽灵体量，不占用前方街道。',
    realisticFacade: '立面细节',
    realisticFacadeHint: '使用程序化窗格和水平分缝，避免纹理拉伸。',
    lotDepth: '地块进深',
    footprintArea: '底盘面积',
    targetFloorArea: '目标建筑面积',
    achievedFar: '实现 FAR',
    estimatedStories: '约合层数',
    openSpace: '开放空间',
    builtHeight: '总高度',
    envelopeArea: '边界面积',
    presetApproximationNote: '这些类分区预设仅用于教学近似，不代表法规级模拟结果。',
    envelopeFootnote: '应用退线后首层可建区域的面积。',
    contextNote: '周边幽灵体量只放在两侧和后方，前方街道保持清晰。',
    teachingNote: '立面细节为程序生成，可随体量变化而不发生纹理拉伸。',
    statusCopied: '链接已复制。',
    statusCopyFailed: '无法自动复制，但仍可从地址栏复制链接。',
    statusSnapshotSaved: '截图已下载。',
    warningNoEnvelope: '退线已经占满地块，没有剩余可建边界。',
    warningCoverageClipped: '请求的覆盖率大于退线允许的底盘面积，因此底盘被裁切。',
    warningHeightLimitReached: '在达到高度上限前，目标 FAR 无法完全实现。',
    warningBaseAboveLimit: '基座高度高于总高度限制。',
    warningUpperTooSlim: '上部退台后塔楼板块过窄，可适当减小退线或降低基座高度。',
    warningSetbackDominant: '退线占用了大部分地块宽度或进深，体量组合空间非常有限。',
    buildingWidth: '建筑宽度',
    buildingDepth: '建筑进深',
    feet: 'ft',
    squareFeet: 'sf',
    percent: '%',
    ratio: 'FAR',
  },
};

const densityLabels: Record<DensityPreset, keyof TranslationSet> = {
  custom: 'custom',
  detachedHouse: 'detachedHouse',
  lowResidential: 'lowResidential',
  mediumResidential: 'mediumResidential',
  higherResidential: 'higherResidential',
};

const languageLabels: Record<Language, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  zh: 'Chinese',
};

const presetPatches: Record<Exclude<DensityPreset, 'custom'>, Partial<ExplorerSettings>> = {
  detachedHouse: {
    lotCoverage: 30,
    far: 0.5,
    heightLimit: 35,
    baseHeight: 20,
    frontSetback: 20,
    rearSetback: 30,
    sideSetback: 10,
    showSetbacks: true,
    showMeasurements: true,
    showTrees: true,
    showContext: true,
    realisticFacade: true,
  },
  lowResidential: {
    lotCoverage: 45,
    far: 1.25,
    heightLimit: 45,
    baseHeight: 28,
    frontSetback: 15,
    rearSetback: 25,
    sideSetback: 8,
    showSetbacks: true,
    showMeasurements: true,
    showTrees: true,
    showContext: true,
    realisticFacade: true,
  },
  mediumResidential: {
    lotCoverage: 65,
    far: 4,
    heightLimit: 80,
    baseHeight: 45,
    frontSetback: 10,
    rearSetback: 20,
    sideSetback: 5,
    showSetbacks: true,
    showMeasurements: true,
    showTrees: true,
    showContext: true,
    realisticFacade: true,
  },
  higherResidential: {
    lotCoverage: 70,
    far: 7.5,
    heightLimit: 120,
    baseHeight: 60,
    frontSetback: 5,
    rearSetback: 15,
    sideSetback: 0,
    showSetbacks: true,
    showMeasurements: false,
    showTrees: true,
    showContext: true,
    realisticFacade: true,
  },
};

const defaultSettings: ExplorerSettings = {
  lotArea: 8000,
  lotWidth: 80,
  lotCoverage: 65,
  far: 4,
  heightLimit: 80,
  baseHeight: 45,
  frontSetback: 10,
  rearSetback: 20,
  sideSetback: 5,
  showSetbacks: true,
  showMeasurements: true,
  showTrees: true,
  showContext: true,
  realisticFacade: true,
};

const numericFields: Array<{
  section: 'parcel' | 'envelope';
  config: NumericFieldConfig;
}> = [
  {
    section: 'parcel',
    config: {
      key: 'lotArea',
      labelKey: 'lotArea',
      hintKey: 'lotAreaHint',
      min: 1500,
      max: 120000,
      step: 100,
      unit: 'squareFeet',
    },
  },
  {
    section: 'parcel',
    config: {
      key: 'lotWidth',
      labelKey: 'lotWidth',
      hintKey: 'lotWidthHint',
      min: 20,
      max: 320,
      step: 1,
      unit: 'feet',
    },
  },
  {
    section: 'parcel',
    config: {
      key: 'lotCoverage',
      labelKey: 'lotCoverage',
      hintKey: 'lotCoverageHint',
      min: 10,
      max: 95,
      step: 1,
      unit: 'percent',
    },
  },
  {
    section: 'parcel',
    config: {
      key: 'far',
      labelKey: 'far',
      hintKey: 'farHint',
      min: 0.2,
      max: 20,
      step: 0.05,
      unit: 'ratio',
      digits: 2,
    },
  },
  {
    section: 'envelope',
    config: {
      key: 'heightLimit',
      labelKey: 'heightLimit',
      hintKey: 'heightLimitHint',
      min: 15,
      max: 400,
      step: 1,
      unit: 'feet',
    },
  },
  {
    section: 'envelope',
    config: {
      key: 'baseHeight',
      labelKey: 'baseHeight',
      hintKey: 'baseHeightHint',
      min: 10,
      max: 180,
      step: 1,
      unit: 'feet',
    },
  },
  {
    section: 'envelope',
    config: {
      key: 'frontSetback',
      labelKey: 'frontSetback',
      hintKey: 'frontSetbackHint',
      min: 0,
      max: 80,
      step: 1,
      unit: 'feet',
    },
  },
  {
    section: 'envelope',
    config: {
      key: 'rearSetback',
      labelKey: 'rearSetback',
      hintKey: 'rearSetbackHint',
      min: 0,
      max: 100,
      step: 1,
      unit: 'feet',
    },
  },
  {
    section: 'envelope',
    config: {
      key: 'sideSetback',
      labelKey: 'sideSetback',
      hintKey: 'sideSetbackHint',
      min: 0,
      max: 40,
      step: 1,
      unit: 'feet',
    },
  },
];

const numericFieldMap = Object.fromEntries(numericFields.map(({ config }) => [config.key, config])) as Record<
  NumericSettingKey,
  NumericFieldConfig
>;

const toggleFields: ToggleFieldConfig[] = [
  { key: 'showSetbacks', labelKey: 'showSetbacks', hintKey: 'showSetbacksHint' },
  { key: 'showMeasurements', labelKey: 'showMeasurements', hintKey: 'showMeasurementsHint' },
  { key: 'showTrees', labelKey: 'showTrees', hintKey: 'showTreesHint' },
  { key: 'showContext', labelKey: 'showContext', hintKey: 'showContextHint' },
  { key: 'realisticFacade', labelKey: 'realisticFacade', hintKey: 'realisticFacadeHint' },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundToStep(value: number, step: number) {
  return Math.round(value / step) * step;
}

function detectLanguage(): Language {
  if (typeof navigator === 'undefined') {
    return 'en';
  }

  const raw = navigator.language.toLowerCase();
  if (raw.startsWith('es')) {
    return 'es';
  }
  if (raw.startsWith('fr')) {
    return 'fr';
  }
  if (raw.startsWith('zh')) {
    return 'zh';
  }
  return 'en';
}

function resolveLanguage(value: string | null | undefined): Language {
  if (value === 'en' || value === 'es' || value === 'fr' || value === 'zh') {
    return value;
  }
  return detectLanguage();
}

function resolvePreset(value: string | null | undefined): DensityPreset {
  switch (value) {
    case 'custom':
      return 'custom';
    case 'detachedHouse':
    case 'detached_house':
      return 'detachedHouse';
    case 'lowResidential':
    case 'low_residential':
    case 'low':
      return 'lowResidential';
    case 'mediumResidential':
    case 'medium_residential':
    case 'medium':
      return 'mediumResidential';
    case 'higherResidential':
    case 'higher_residential':
    case 'high':
      return 'higherResidential';
    default:
      return 'mediumResidential';
  }
}

function applyPreset(current: ExplorerSettings, preset: DensityPreset): ExplorerSettings {
  if (preset === 'custom') {
    return current;
  }
  return { ...current, ...presetPatches[preset] };
}

function parseBoolean(value: string | null, fallback: boolean) {
  if (value === null) {
    return fallback;
  }
  return value === '1' || value === 'true';
}

function parseSettingValue(key: NumericSettingKey, rawValue: string | null, fallback: number) {
  const config = numericFieldMap[key];
  if (rawValue === null) {
    return fallback;
  }
  const parsed = Number(rawValue);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return clamp(roundToStep(parsed, config.step), config.min, config.max);
}

function createInitialState() {
  if (typeof window === 'undefined') {
    return {
      language: 'en' as Language,
      preset: 'mediumResidential' as DensityPreset,
      settings: { ...defaultSettings },
    };
  }

  const params = new URLSearchParams(window.location.search);
  const preset = resolvePreset(params.get('preset'));
  const seededSettings = applyPreset({ ...defaultSettings }, preset);

  const settings: ExplorerSettings = {
    lotArea: parseSettingValue('lotArea', params.get('lotArea'), seededSettings.lotArea),
    lotWidth: parseSettingValue('lotWidth', params.get('lotWidth'), seededSettings.lotWidth),
    lotCoverage: parseSettingValue('lotCoverage', params.get('lotCoverage'), seededSettings.lotCoverage),
    far: parseSettingValue('far', params.get('far'), seededSettings.far),
    heightLimit: parseSettingValue('heightLimit', params.get('heightLimit'), seededSettings.heightLimit),
    baseHeight: parseSettingValue('baseHeight', params.get('baseHeight'), seededSettings.baseHeight),
    frontSetback: parseSettingValue('frontSetback', params.get('frontSetback'), seededSettings.frontSetback),
    rearSetback: parseSettingValue('rearSetback', params.get('rearSetback'), seededSettings.rearSetback),
    sideSetback: parseSettingValue('sideSetback', params.get('sideSetback'), seededSettings.sideSetback),
    showSetbacks: parseBoolean(params.get('showSetbacks'), seededSettings.showSetbacks),
    showMeasurements: parseBoolean(params.get('showMeasurements'), seededSettings.showMeasurements),
    showTrees: parseBoolean(params.get('showTrees'), seededSettings.showTrees),
    showContext: parseBoolean(params.get('showContext'), seededSettings.showContext),
    realisticFacade: parseBoolean(params.get('realisticFacade'), seededSettings.realisticFacade),
  };

  return {
    language: resolveLanguage(params.get('lang')),
    preset,
    settings,
  };
}

function formatNumber(value: number, language: Language, digits = 0) {
  return new Intl.NumberFormat(localeByLanguage[language], {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatValue(value: number, language: Language, unit: UnitKey, text: TranslationSet, digits = 0) {
  if (unit === 'none') {
    return formatNumber(value, language, digits);
  }

  const unitLabel =
    unit === 'feet'
      ? text.feet
      : unit === 'squareFeet'
        ? text.squareFeet
        : unit === 'percent'
          ? text.percent
          : text.ratio;

  if (unit === 'percent') {
    return `${formatNumber(value, language, digits)}${unitLabel}`;
  }

  return `${formatNumber(value, language, digits)} ${unitLabel}`;
}

function buildQuery(settings: ExplorerSettings, language: Language, preset: DensityPreset) {
  const params = new URLSearchParams();
  params.set('lang', language);
  params.set('preset', preset);
  params.set('lotArea', String(settings.lotArea));
  params.set('lotWidth', String(settings.lotWidth));
  params.set('lotCoverage', String(settings.lotCoverage));
  params.set('far', String(settings.far));
  params.set('heightLimit', String(settings.heightLimit));
  params.set('baseHeight', String(settings.baseHeight));
  params.set('frontSetback', String(settings.frontSetback));
  params.set('rearSetback', String(settings.rearSetback));
  params.set('sideSetback', String(settings.sideSetback));
  params.set('showSetbacks', settings.showSetbacks ? '1' : '0');
  params.set('showMeasurements', settings.showMeasurements ? '1' : '0');
  params.set('showTrees', settings.showTrees ? '1' : '0');
  params.set('showContext', settings.showContext ? '1' : '0');
  params.set('realisticFacade', settings.realisticFacade ? '1' : '0');
  return params;
}

function buildShareUrl(settings: ExplorerSettings, language: Language, preset: DensityPreset, absolute = true) {
  const query = buildQuery(settings, language, preset).toString();
  if (typeof window === 'undefined') {
    return `?${query}`;
  }

  const suffix = query ? `?${query}` : '';
  return absolute
    ? `${window.location.origin}${window.location.pathname}${suffix}`
    : `${window.location.pathname}${suffix}`;
}

function computeMassing(settings: ExplorerSettings): MassingData {
  const lotWidth = Math.max(settings.lotWidth, 1);
  const lotDepth = Math.max(settings.lotArea / lotWidth, 25);
  const envelopeWidth = Math.max(lotWidth - settings.sideSetback * 2, 0);
  const envelopeDepth = Math.max(lotDepth - settings.frontSetback - settings.rearSetback, 0);
  const envelopeArea = envelopeWidth * envelopeDepth;

  const targetFootprintArea = (settings.lotCoverage / 100) * settings.lotArea;
  const footprintScale = envelopeArea > 0 ? Math.sqrt(Math.min(1, targetFootprintArea / envelopeArea)) : 0;
  const footprintWidth = envelopeWidth * footprintScale;
  const footprintDepth = envelopeDepth * footprintScale;
  const footprintArea = footprintWidth * footprintDepth;
  const footprintCenterZ = (settings.frontSetback - settings.rearSetback) / 2;

  const sideStep = settings.showSetbacks ? Math.min(settings.sideSetback * 0.8, footprintWidth * 0.18) : 0;
  const frontStep = settings.showSetbacks ? Math.min(settings.frontSetback * 0.7, footprintDepth * 0.16) : 0;
  const rearStep = settings.showSetbacks ? Math.min(settings.rearSetback * 0.55, footprintDepth * 0.14) : 0;
  const upperWidth = settings.showSetbacks ? Math.max(footprintWidth - sideStep * 2, footprintWidth * 0.5) : footprintWidth;
  const upperDepth = settings.showSetbacks
    ? Math.max(footprintDepth - frontStep - rearStep, footprintDepth * 0.52)
    : footprintDepth;
  const upperArea = upperWidth * upperDepth;
  const upperCenterZ = footprintCenterZ + (frontStep - rearStep) / 2;

  const targetFloorArea = settings.far * settings.lotArea;
  const baseCapacity = footprintArea > 0 ? footprintArea * (settings.baseHeight / floorHeight) : 0;
  const upperPlateArea = settings.showSetbacks ? upperArea : footprintArea;

  let requiredHeight = 0;
  if (footprintArea > 0) {
    if (targetFloorArea <= baseCapacity || upperPlateArea <= 0) {
      requiredHeight = (targetFloorArea / footprintArea) * floorHeight;
    } else {
      requiredHeight = settings.baseHeight + ((targetFloorArea - baseCapacity) / upperPlateArea) * floorHeight;
    }
  }

  const totalHeight = clamp(requiredHeight, 0, settings.heightLimit);
  const baseBuiltHeight = Math.min(totalHeight, settings.baseHeight);
  const upperBuiltHeight = Math.max(totalHeight - settings.baseHeight, 0);
  const achievedFloorArea =
    (baseBuiltHeight / floorHeight) * footprintArea + (upperBuiltHeight / floorHeight) * upperPlateArea;
  const achievedFar = settings.lotArea > 0 ? achievedFloorArea / settings.lotArea : 0;
  const estimatedStories = totalHeight > 0 ? Math.max(1, Math.round(totalHeight / floorHeight)) : 0;
  const openSpaceArea = Math.max(settings.lotArea - footprintArea, 0);

  const warnings: WarningMessage[] = [];
  if (envelopeWidth <= 2 || envelopeDepth <= 2) {
    warnings.push({ key: 'noEnvelope', level: 'danger' });
  }
  if (targetFootprintArea > envelopeArea + 5 && envelopeArea > 0) {
    warnings.push({ key: 'coverageClipped', level: 'warning' });
  }
  if (settings.baseHeight > settings.heightLimit) {
    warnings.push({ key: 'baseAboveLimit', level: 'danger' });
  }
  if (targetFloorArea > achievedFloorArea + 50) {
    warnings.push({ key: 'heightLimitReached', level: 'warning' });
  }
  if (
    settings.showSetbacks &&
    upperBuiltHeight > 0 &&
    (upperWidth < Math.max(18, lotWidth * 0.18) || upperDepth < Math.max(18, lotDepth * 0.18))
  ) {
    warnings.push({ key: 'upperTooSlim', level: 'info' });
  }
  if (envelopeWidth < lotWidth * 0.35 || envelopeDepth < lotDepth * 0.35) {
    warnings.push({ key: 'setbackDominant', level: 'info' });
  }

  return {
    lotDepth,
    lotWidth,
    lotArea: settings.lotArea,
    envelopeWidth,
    envelopeDepth,
    envelopeArea,
    footprintWidth,
    footprintDepth,
    footprintArea,
    footprintCenterZ,
    upperWidth,
    upperDepth,
    upperArea,
    upperCenterZ,
    baseBuiltHeight,
    upperBuiltHeight,
    totalHeight,
    targetFloorArea,
    achievedFloorArea,
    achievedFar,
    estimatedStories,
    openSpaceArea,
    warnings,
  };
}

function rectanglePoints(width: number, depth: number, y: number, zOffset = 0) {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;

  return [
    [-halfWidth, y, zOffset - halfDepth],
    [halfWidth, y, zOffset - halfDepth],
    [halfWidth, y, zOffset + halfDepth],
    [-halfWidth, y, zOffset + halfDepth],
    [-halfWidth, y, zOffset - halfDepth],
  ] as Array<[number, number, number]>;
}

function copyWithFallback(text: string) {
  if (typeof document === 'undefined') {
    return false;
  }

  const input = document.createElement('textarea');
  input.value = text;
  input.setAttribute('readonly', '');
  input.style.position = 'absolute';
  input.style.left = '-9999px';
  document.body.appendChild(input);
  input.select();
  const success = document.execCommand('copy');
  document.body.removeChild(input);
  return success;
}

function WarningCopy({ warning, text }: { warning: WarningMessage; text: TranslationSet }) {
  const map: Record<WarningKey, string> = {
    noEnvelope: text.warningNoEnvelope,
    coverageClipped: text.warningCoverageClipped,
    heightLimitReached: text.warningHeightLimitReached,
    baseAboveLimit: text.warningBaseAboveLimit,
    upperTooSlim: text.warningUpperTooSlim,
    setbackDominant: text.warningSetbackDominant,
  };

  return <>{map[warning.key]}</>;
}

function NumericField({
  config,
  value,
  language,
  text,
  onChange,
}: {
  config: NumericFieldConfig;
  value: number;
  language: Language;
  text: TranslationSet;
  onChange: (nextValue: number) => void;
}) {
  const digits = config.digits ?? (config.step < 1 ? 2 : 0);
  const display = formatValue(value, language, config.unit, text, digits);

  return (
    <div className="field-card">
      <div className="field-top">
        <div className="field-label">{text[config.labelKey]}</div>
        <div className="field-value">{display}</div>
      </div>
      <p className="field-help">{text[config.hintKey]}</p>
      <div className="field-inputs">
        <input
          className="slider"
          type="range"
          min={config.min}
          max={config.max}
          step={config.step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-label={text[config.labelKey]}
        />
        <input
          className="number-input"
          type="number"
          min={config.min}
          max={config.max}
          step={config.step}
          value={Number.isInteger(value) ? String(value) : value.toFixed(digits)}
          onChange={(event) => {
            const parsed = Number(event.target.value);
            if (!Number.isNaN(parsed)) {
              onChange(parsed);
            }
          }}
        />
      </div>
    </div>
  );
}

function ToggleField({
  config,
  text,
  value,
  onToggle,
}: {
  config: ToggleFieldConfig;
  text: TranslationSet;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="toggle-card">
      <div className="toggle-copy">
        <div className="toggle-label">{text[config.labelKey]}</div>
        <p className="toggle-help">{text[config.hintKey]}</p>
      </div>
      <button
        type="button"
        className={`toggle-button ${value ? 'is-active' : ''}`}
        onClick={onToggle}
        aria-pressed={value}
        aria-label={text[config.labelKey]}
      >
        <div className="toggle-thumb" />
      </button>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext: string;
}) {
  return (
    <div className="stat-card">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      <p className="stat-subtext">{subtext}</p>
    </div>
  );
}

function SceneCamera({ data }: { data: MassingData }) {
  const { camera } = useThree();

  useEffect(() => {
    const span = Math.max(data.lotWidth, data.lotDepth, data.totalHeight * 1.6, 120);
    const targetHeight = Math.max(data.totalHeight * 0.34, 16);
    camera.position.set(span * 0.92, Math.max(data.totalHeight * 0.88, 68), span * 1.04);
    camera.lookAt(new THREE.Vector3(0, targetHeight, data.footprintCenterZ * 0.28));
    camera.updateProjectionMatrix();
  }, [camera, data]);

  return (
    <OrbitControls
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={60}
      maxDistance={950}
      maxPolarAngle={Math.PI / 2.04}
      target={[0, Math.max(data.totalHeight * 0.3, 18), data.footprintCenterZ * 0.22]}
    />
  );
}

function FacadeFace({
  width,
  height,
  position,
  rotation,
}: {
  width: number;
  height: number;
  position: [number, number, number];
  rotation: [number, number, number];
}) {
  if (width < 12 || height < 16) {
    return null;
  }

  const usableWidth = Math.max(width - 6, 8);
  const usableHeight = Math.max(height - 7, 9);
  const cols = clamp(Math.floor(usableWidth / 12), 1, 16);
  const rows = clamp(Math.floor(usableHeight / floorHeight), 1, 20);
  const stepX = usableWidth / cols;
  const stepY = usableHeight / rows;
  const windowWidth = Math.min(5.2, stepX * 0.66);
  const windowHeight = Math.min(6.7, stepY * 0.62);
  const sill = -usableHeight / 2 + stepY * 0.66;
  const bandRows = Math.max(1, Math.floor(height / floorHeight));

  return (
    <group position={position} rotation={rotation}>
      {Array.from({ length: bandRows }).map((_, rowIndex) => {
        const y = -height / 2 + floorHeight * (rowIndex + 1) - 0.4;
        if (y >= height / 2 - 0.5) {
          return null;
        }
        return (
          <mesh key={`band-${rowIndex}`} position={[0, y, 0.18]}>
            <boxGeometry args={[Math.max(width - 2.4, 6), 0.32, 0.22]} />
            <meshStandardMaterial color="#d8c1a0" roughness={0.42} metalness={0.12} />
          </mesh>
        );
      })}
      {Array.from({ length: rows }).map((_, rowIndex) =>
        Array.from({ length: cols }).map((__, colIndex) => {
          const x = -usableWidth / 2 + stepX * (colIndex + 0.5);
          const y = sill + stepY * rowIndex;
          return (
            <mesh key={`${rowIndex}-${colIndex}`} position={[x, y, 0.21]}>
              <planeGeometry args={[windowWidth, windowHeight]} />
              <meshStandardMaterial
                color="#80a8b8"
                emissive="#274a5b"
                emissiveIntensity={0.34}
                roughness={0.22}
                metalness={0.5}
              />
            </mesh>
          );
        }),
      )}
    </group>
  );
}

function FacadeSystem({
  width,
  depth,
  height,
  centerZ,
}: {
  width: number;
  depth: number;
  height: number;
  centerZ: number;
}) {
  return (
    <group position={[0, 0, centerZ]}>
      <FacadeFace
        width={width}
        height={height}
        position={[0, height / 2, depth / 2 + 0.16]}
        rotation={[0, 0, 0]}
      />
      <FacadeFace
        width={width}
        height={height}
        position={[0, height / 2, -depth / 2 - 0.16]}
        rotation={[0, Math.PI, 0]}
      />
      <FacadeFace
        width={depth}
        height={height}
        position={[width / 2 + 0.16, height / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
      />
      <FacadeFace
        width={depth}
        height={height}
        position={[-width / 2 - 0.16, height / 2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
      />
    </group>
  );
}

function BuildingMass({
  width,
  depth,
  height,
  centerZ,
  realisticFacade,
  color,
}: {
  width: number;
  depth: number;
  height: number;
  centerZ: number;
  realisticFacade: boolean;
  color: string;
}) {
  if (width <= 0 || depth <= 0 || height <= 0) {
    return null;
  }

  return (
    <group position={[0, 0, centerZ]}>
      <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={color} roughness={0.58} metalness={0.08} />
        <Edges color="#15232c" />
      </mesh>
      <mesh position={[0, height + 0.2, 0]}>
        <boxGeometry args={[Math.max(width - 2.2, 4), 0.4, Math.max(depth - 2.2, 4)]} />
        <meshStandardMaterial color="#d8c3a4" roughness={0.44} metalness={0.16} />
      </mesh>
      {realisticFacade ? <FacadeSystem width={width} depth={depth} height={height} centerZ={0} /> : null}
    </group>
  );
}

function Tree({
  position,
  scale,
}: {
  position: [number, number, number];
  scale: number;
}) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 5.5 * scale, 0]}>
        <cylinderGeometry args={[0.9 * scale, 1.3 * scale, 11 * scale, 8]} />
        <meshStandardMaterial color="#705237" roughness={0.95} />
      </mesh>
      <mesh castShadow position={[0, 15.4 * scale, 0]}>
        <sphereGeometry args={[6.4 * scale, 14, 14]} />
        <meshStandardMaterial color="#5f8f49" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[2.4 * scale, 14.2 * scale, 1.1 * scale]}>
        <sphereGeometry args={[4.4 * scale, 12, 12]} />
        <meshStandardMaterial color="#6ea35a" roughness={0.88} />
      </mesh>
      <mesh castShadow position={[-2.2 * scale, 13.8 * scale, -0.9 * scale]}>
        <sphereGeometry args={[3.9 * scale, 12, 12]} />
        <meshStandardMaterial color="#4f7e40" roughness={0.88} />
      </mesh>
    </group>
  );
}

function TreeLayer({ data }: { data: MassingData }) {
  const sideOffset = Math.max(data.lotWidth * 0.12, 8);
  const rearOffset = Math.max(data.lotDepth * 0.12, 10);
  const candidates: Array<[number, number, number]> = [
    [-(data.lotWidth / 2) + sideOffset, 0, -(data.lotDepth / 2) + rearOffset],
    [data.lotWidth / 2 - sideOffset, 0, -(data.lotDepth / 2) + rearOffset * 1.1],
    [-(data.lotWidth / 2) + sideOffset * 1.1, 0, data.lotDepth / 2 - rearOffset],
    [data.lotWidth / 2 - sideOffset, 0, data.lotDepth / 2 - rearOffset * 1.1],
    [-(data.lotWidth / 2) + sideOffset * 0.9, 0, 0],
    [data.lotWidth / 2 - sideOffset * 0.95, 0, data.lotDepth * 0.12],
    [0, 0, data.lotDepth / 2 - rearOffset * 1.25],
  ];

  const frontEdge = data.footprintCenterZ - data.footprintDepth / 2;
  const rearEdge = data.footprintCenterZ + data.footprintDepth / 2;
  const scale = clamp(Math.min(data.lotWidth / 48, 1.7), 0.95, 1.7);

  return (
    <group>
      {candidates
        .filter(([x, , z]) => Math.abs(x) > data.footprintWidth / 2 + 8 || z < frontEdge - 8 || z > rearEdge + 8)
        .map((position, index) => (
          <Tree key={index} position={position} scale={scale} />
        ))}
    </group>
  );
}

function ContextBuildings({ data }: { data: MassingData }) {
  const sideWidth = clamp(data.lotWidth * 0.58, 45, 130);
  const sideDepth = clamp(data.lotDepth * 0.46, 55, 180);
  const rearWidth = clamp(data.lotWidth * 0.72, 55, 160);
  const rearDepth = clamp(data.lotDepth * 0.28, 40, 90);
  const sideHeight = clamp(data.totalHeight * 0.84 + 28, 45, 240);
  const rearHeight = clamp(data.totalHeight * 0.72 + 20, 35, 190);

  const buildings = [
    {
      position: [-(data.lotWidth / 2 + sideWidth / 2 + 26), sideHeight / 2, 18] as [number, number, number],
      size: [sideWidth, sideHeight, sideDepth] as [number, number, number],
    },
    {
      position: [data.lotWidth / 2 + sideWidth / 2 + 26, sideHeight / 2, 12] as [number, number, number],
      size: [sideWidth, sideHeight, sideDepth] as [number, number, number],
    },
    {
      position: [0, rearHeight / 2, data.lotDepth / 2 + rearDepth / 2 + 28] as [number, number, number],
      size: [rearWidth, rearHeight, rearDepth] as [number, number, number],
    },
  ];

  return (
    <group>
      {buildings.map((building, index) => (
        <mesh key={index} position={building.position}>
          <boxGeometry args={building.size} />
          <meshStandardMaterial color="#aebcca" transparent opacity={0.16} roughness={0.95} />
          <Edges color="#90a0b0" />
        </mesh>
      ))}
    </group>
  );
}

function MeasurementTag({
  label,
  position,
}: {
  label: string;
  position: Point3;
}) {
  return (
    <Html position={position} center distanceFactor={95}>
      <div className="measurement-chip">{label}</div>
    </Html>
  );
}

function getCapPoints(position: Point3, axis: 'x' | 'y' | 'z', size: number): [Point3, Point3] {
  if (axis === 'x') {
    return [
      [position[0], position[1], position[2] - size / 2],
      [position[0], position[1], position[2] + size / 2],
    ];
  }

  if (axis === 'z') {
    return [
      [position[0] - size / 2, position[1], position[2]],
      [position[0] + size / 2, position[1], position[2]],
    ];
  }

  return [
    [position[0] - size / 2, position[1], position[2]],
    [position[0] + size / 2, position[1], position[2]],
  ];
}

function BlueprintDimension({
  start,
  end,
  label,
  labelPosition,
  color,
  extensionLines,
  capAxis,
  capSize = 3,
}: {
  start: Point3;
  end: Point3;
  label: string;
  labelPosition: Point3;
  color: string;
  extensionLines?: Array<[Point3, Point3]>;
  capAxis: 'x' | 'y' | 'z';
  capSize?: number;
}) {
  const startCap = getCapPoints(start, capAxis, capSize);
  const endCap = getCapPoints(end, capAxis, capSize);

  return (
    <group>
      {extensionLines?.map(([from, to], index) => (
        <Line key={`ext-${index}`} points={[from, to]} color={color} lineWidth={0.8} transparent opacity={0.72} />
      ))}
      <Line points={[start, end]} color={color} lineWidth={1} transparent opacity={0.9} />
      <Line points={startCap} color={color} lineWidth={1} transparent opacity={0.9} />
      <Line points={endCap} color={color} lineWidth={1} transparent opacity={0.9} />
      <MeasurementTag label={label} position={labelPosition} />
    </group>
  );
}

function MeasurementLayer({
  data,
  language,
  text,
}: {
  data: MassingData;
  language: Language;
  text: TranslationSet;
}) {
  const lotWidthOffsetZ = -data.lotDepth / 2 - clamp(data.lotWidth * 0.08, 10, 20);
  const lotDepthOffsetX = data.lotWidth / 2 + clamp(data.lotWidth * 0.08, 10, 20);
  const roofY = data.totalHeight + clamp(data.totalHeight * 0.012, 0.9, 1.8);
  const buildingWidthZ = data.footprintCenterZ - data.footprintDepth / 2 + clamp(data.footprintDepth * 0.08, 2, 5);
  const buildingDepthX = data.footprintWidth / 2 - clamp(data.footprintWidth * 0.08, 2, 5);
  const heightOffsetX = data.footprintWidth / 2 + clamp(data.lotWidth * 0.035, 4, 10);
  const heightOffsetZ = data.footprintCenterZ + data.footprintDepth / 2 + clamp(data.lotDepth * 0.03, 4, 9);

  const lotWidthLabel = `${text.lotWidth} ${formatValue(data.lotWidth, language, 'feet', text)}`;
  const lotDepthLabel = `${text.lotDepth} ${formatValue(data.lotDepth, language, 'feet', text)}`;
  const buildingWidthLabel = `${text.buildingWidth} ${formatValue(data.footprintWidth, language, 'feet', text)}`;
  const buildingDepthLabel = `${text.buildingDepth} ${formatValue(data.footprintDepth, language, 'feet', text)}`;
  const heightLabel = `${text.builtHeight} ${formatValue(data.totalHeight, language, 'feet', text)}`;

  return (
    <group>
      <BlueprintDimension
        start={[-data.lotWidth / 2, 0.12, lotWidthOffsetZ]}
        end={[data.lotWidth / 2, 0.12, lotWidthOffsetZ]}
        label={lotWidthLabel}
        labelPosition={[0, 0.9, lotWidthOffsetZ]}
        color="#d5e1e6"
        capAxis="x"
        extensionLines={[
          [
            [-data.lotWidth / 2, 0.12, -data.lotDepth / 2],
            [-data.lotWidth / 2, 0.12, lotWidthOffsetZ],
          ],
          [
            [data.lotWidth / 2, 0.12, -data.lotDepth / 2],
            [data.lotWidth / 2, 0.12, lotWidthOffsetZ],
          ],
        ]}
      />

      <BlueprintDimension
        start={[lotDepthOffsetX, 0.12, -data.lotDepth / 2]}
        end={[lotDepthOffsetX, 0.12, data.lotDepth / 2]}
        label={lotDepthLabel}
        labelPosition={[lotDepthOffsetX, 0.9, 0]}
        color="#d5e1e6"
        capAxis="z"
        extensionLines={[
          [
            [data.lotWidth / 2, 0.12, -data.lotDepth / 2],
            [lotDepthOffsetX, 0.12, -data.lotDepth / 2],
          ],
          [
            [data.lotWidth / 2, 0.12, data.lotDepth / 2],
            [lotDepthOffsetX, 0.12, data.lotDepth / 2],
          ],
        ]}
      />

      {data.footprintWidth > 16 ? (
        <BlueprintDimension
          start={[-data.footprintWidth / 2, roofY, buildingWidthZ]}
          end={[data.footprintWidth / 2, roofY, buildingWidthZ]}
          label={buildingWidthLabel}
          labelPosition={[0, roofY + 0.8, buildingWidthZ]}
          color="#111111"
          capAxis="x"
          extensionLines={[
            [
              [-data.footprintWidth / 2, data.totalHeight + 0.2, buildingWidthZ],
              [-data.footprintWidth / 2, roofY, buildingWidthZ],
            ],
            [
              [data.footprintWidth / 2, data.totalHeight + 0.2, buildingWidthZ],
              [data.footprintWidth / 2, roofY, buildingWidthZ],
            ],
          ]}
          capSize={2.5}
        />
      ) : null}

      {data.footprintDepth > 16 ? (
        <BlueprintDimension
          start={[buildingDepthX, roofY, data.footprintCenterZ - data.footprintDepth / 2]}
          end={[buildingDepthX, roofY, data.footprintCenterZ + data.footprintDepth / 2]}
          label={buildingDepthLabel}
          labelPosition={[buildingDepthX, roofY + 0.8, data.footprintCenterZ]}
          color="#111111"
          capAxis="z"
          extensionLines={[
            [
              [buildingDepthX, data.totalHeight + 0.2, data.footprintCenterZ - data.footprintDepth / 2],
              [buildingDepthX, roofY, data.footprintCenterZ - data.footprintDepth / 2],
            ],
            [
              [buildingDepthX, data.totalHeight + 0.2, data.footprintCenterZ + data.footprintDepth / 2],
              [buildingDepthX, roofY, data.footprintCenterZ + data.footprintDepth / 2],
            ],
          ]}
          capSize={2.5}
        />
      ) : null}

      <BlueprintDimension
        start={[heightOffsetX, 0.2, heightOffsetZ]}
        end={[heightOffsetX, data.totalHeight, heightOffsetZ]}
        label={heightLabel}
        labelPosition={[heightOffsetX, Math.max(data.totalHeight * 0.55, 8), heightOffsetZ]}
        color="#111111"
        capAxis="y"
        extensionLines={[
          [
            [data.footprintWidth / 2, 0.2, heightOffsetZ],
            [heightOffsetX, 0.2, heightOffsetZ],
          ],
          [
            [data.footprintWidth / 2, data.totalHeight, heightOffsetZ],
            [heightOffsetX, data.totalHeight, heightOffsetZ],
          ],
        ]}
        capSize={3}
      />
    </group>
  );
}

function GroundAndGuides({
  data,
  settings,
}: {
  data: MassingData;
  settings: ExplorerSettings;
}) {
  const streetDepth = clamp(data.lotWidth * 0.5, 28, 60);
  const streetWidth = Math.max(data.lotWidth + 170, 240);
  const streetCenterZ = -(data.lotDepth / 2) - streetDepth / 2 - 5;
  const sidewalkDepth = 12;
  const buildableCenterZ = (settings.frontSetback - settings.rearSetback) / 2;
  const streetThickness = 0.28;
  const sidewalkThickness = 0.22;
  const stripeThickness = 0.04;
  const streetTop = -0.04;
  const sidewalkTop = 0.03;
  const stripeTop = streetTop + 0.025;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} receiveShadow>
        <planeGeometry args={[Math.max(data.lotWidth + 260, 340), Math.max(data.lotDepth + 260, 340)]} />
        <meshStandardMaterial color="#dfe4dc" roughness={1} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[data.lotWidth, data.lotDepth]} />
        <meshStandardMaterial color="#6ca258" roughness={0.98} />
      </mesh>

      <Line points={rectanglePoints(data.lotWidth, data.lotDepth, 0.18)} color="#dce7d0" lineWidth={1} />

      {settings.showSetbacks && settings.frontSetback > 0 ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, -(data.lotDepth / 2) + settings.frontSetback / 2]}>
          <planeGeometry args={[data.lotWidth, settings.frontSetback]} />
          <meshStandardMaterial color="#c39254" transparent opacity={0.18} />
        </mesh>
      ) : null}
      {settings.showSetbacks && settings.rearSetback > 0 ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, data.lotDepth / 2 - settings.rearSetback / 2]}>
          <planeGeometry args={[data.lotWidth, settings.rearSetback]} />
          <meshStandardMaterial color="#c39254" transparent opacity={0.18} />
        </mesh>
      ) : null}
      {settings.showSetbacks && settings.sideSetback > 0 ? (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-data.lotWidth / 2 + settings.sideSetback / 2, 0.08, 0]}>
            <planeGeometry args={[settings.sideSetback, data.lotDepth]} />
            <meshStandardMaterial color="#c39254" transparent opacity={0.16} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[data.lotWidth / 2 - settings.sideSetback / 2, 0.08, 0]}>
            <planeGeometry args={[settings.sideSetback, data.lotDepth]} />
            <meshStandardMaterial color="#c39254" transparent opacity={0.16} />
          </mesh>
        </>
      ) : null}

      {settings.showSetbacks && data.envelopeWidth > 0 && data.envelopeDepth > 0 ? (
        <Line
          points={rectanglePoints(data.envelopeWidth, data.envelopeDepth, 0.25, buildableCenterZ)}
          color="#f1ce88"
          lineWidth={1}
        />
      ) : null}

      <mesh position={[0, streetTop - streetThickness / 2, streetCenterZ]} receiveShadow>
        <boxGeometry args={[streetWidth, streetThickness, streetDepth]} />
        <meshStandardMaterial color="#55606c" roughness={0.98} />
      </mesh>

      <mesh position={[0, sidewalkTop - sidewalkThickness / 2, -(data.lotDepth / 2) - sidewalkDepth / 2]}>
        <boxGeometry args={[streetWidth, sidewalkThickness, sidewalkDepth]} />
        <meshStandardMaterial color="#c7bcb0" roughness={0.92} />
      </mesh>

      <mesh position={[0, stripeTop - stripeThickness / 2, streetCenterZ]}>
        <boxGeometry args={[streetWidth * 0.04, stripeThickness, streetDepth * 0.76]} />
        <meshStandardMaterial color="#f5eee3" roughness={0.75} />
      </mesh>
    </group>
  );
}

function MassingScene({
  settings,
  data,
  language,
  text,
}: {
  settings: ExplorerSettings;
  data: MassingData;
  language: Language;
  text: TranslationSet;
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      camera={{ fov: 42, near: 0.1, far: 4000 }}
    >
      <color attach="background" args={['#edf3ef']} />
      <hemisphereLight intensity={0.7} groundColor="#a8b49f" color="#f6fbff" />
      <directionalLight
        castShadow
        position={[180, 240, 140]}
        intensity={1.35}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <Sky distance={1800} sunPosition={[120, 80, 20]} inclination={0.52} azimuth={0.22} />
      <SceneCamera data={data} />
      <GroundAndGuides data={data} settings={settings} />
      {settings.showContext ? <ContextBuildings data={data} /> : null}
      {settings.showTrees ? <TreeLayer data={data} /> : null}
      <BuildingMass
        width={data.footprintWidth}
        depth={data.footprintDepth}
        height={data.baseBuiltHeight + (settings.showSetbacks ? 0 : data.upperBuiltHeight)}
        centerZ={data.footprintCenterZ}
        realisticFacade={settings.realisticFacade}
        color="#b79875"
      />
      {settings.showSetbacks && data.upperBuiltHeight > 0 ? (
        <BuildingMass
          width={data.upperWidth}
          depth={data.upperDepth}
          height={data.upperBuiltHeight}
          centerZ={data.upperCenterZ}
          realisticFacade={settings.realisticFacade}
          color="#ceb08f"
        />
      ) : null}
      {settings.showMeasurements ? <MeasurementLayer data={data} language={language} text={text} /> : null}
    </Canvas>
  );
}

export default function App() {
  const initial = useMemo(() => createInitialState(), []);
  const [language, setLanguage] = useState<Language>(initial.language);
  const [preset, setPreset] = useState<DensityPreset>(initial.preset);
  const [settings, setSettings] = useState<ExplorerSettings>(initial.settings);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [canCollapseSidebar, setCanCollapseSidebar] = useState(() =>
    typeof window === 'undefined' ? true : window.innerWidth >= 1100,
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sceneHostRef = useRef<HTMLDivElement | null>(null);
  const deferredSettings = useDeferredValue(settings);
  const text = translations[language];

  const analysis = useMemo(() => computeMassing(settings), [settings]);
  const sceneData = useMemo(() => computeMassing(deferredSettings), [deferredSettings]);
  const isSidebarCollapsed = canCollapseSidebar && sidebarCollapsed;

  useEffect(() => {
    const nextUrl = buildShareUrl(settings, language, preset, false);
    window.history.replaceState({}, '', nextUrl);
  }, [settings, language, preset]);

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1100;
      setCanCollapseSidebar(desktop);
      if (!desktop) {
        setSidebarCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!statusMessage) {
      return undefined;
    }
    const timeout = window.setTimeout(() => setStatusMessage(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [statusMessage]);

  const updateNumericSetting = (key: NumericSettingKey, nextValue: number) => {
    const field = numericFieldMap[key];
    setPreset('custom');
    setSettings((current) => ({
      ...current,
      [key]: clamp(roundToStep(nextValue, field.step), field.min, field.max),
    }));
  };

  const updateToggleSetting = (key: ToggleSettingKey) => {
    setPreset('custom');
    setSettings((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const applyDensityPreset = (nextPreset: DensityPreset) => {
    setPreset(nextPreset);
    if (nextPreset === 'custom') {
      return;
    }
    setSettings((current) => applyPreset(current, nextPreset));
  };

  const handleShare = async () => {
    const url = buildShareUrl(settings, language, preset, true);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else if (!copyWithFallback(url)) {
        throw new Error('Clipboard unavailable');
      }
      setStatusMessage(text.statusCopied);
    } catch {
      setStatusMessage(text.statusCopyFailed);
    }
  };

  const handleSnapshot = () => {
    const canvas = sceneHostRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) {
      setStatusMessage(text.statusCopyFailed);
      return;
    }

    const link = document.createElement('a');
    link.download = 'far-explorer-snapshot.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    setStatusMessage(text.statusSnapshotSaved);
  };

  const notes = [text.presetApproximationNote, text.contextNote, text.envelopeFootnote, text.teachingNote];

  return (
    <div className="app-shell">
      <div className={`workspace-grid ${isSidebarCollapsed ? 'is-sidebar-collapsed' : ''}`}>
        <aside className={`panel sidebar-shell ${isSidebarCollapsed ? 'is-collapsed' : ''}`}>
          <div className="sidebar-topbar">
            <div className="sidebar-brand">
              <span className="sidebar-kicker">{text.brandKicker}</span>
              {!isSidebarCollapsed ? <h1 className="sidebar-title">{text.title}</h1> : null}
            </div>
            {canCollapseSidebar ? (
              <button
                type="button"
                className="collapse-button"
                onClick={() => setSidebarCollapsed((current) => !current)}
                aria-label={isSidebarCollapsed ? text.expandSidebar : text.collapseSidebar}
                title={isSidebarCollapsed ? text.expandSidebar : text.collapseSidebar}
              >
                {isSidebarCollapsed ? '›' : '‹'}
              </button>
            ) : null}
          </div>

          <div className="sidebar-mini-mark" aria-hidden={!isSidebarCollapsed}>
            FAR
          </div>

          <div className={`sidebar-scroll ${isSidebarCollapsed ? 'is-hidden' : ''}`}>
            <header className="sidebar-header">
              <p className="sidebar-subtitle">{text.subtitle}</p>
            </header>

            <section className="sidebar-section">
              <div className="sidebar-section-header">
                <h2 className="section-heading">{text.language}</h2>
              </div>
              <label className="select-field">
                <span className="sr-only">{text.language}</span>
                <select
                  className="select-input"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value as Language)}
                >
                  {(Object.keys(languageLabels) as Language[]).map((item) => (
                    <option key={item} value={item}>
                      {languageLabels[item]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="preset-field">
                <span className="select-label">{text.density}</span>
                <div className="density-grid">
                  {(Object.keys(densityLabels) as DensityPreset[]).map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`pill-button ${preset === item ? 'is-active' : ''}`}
                      onClick={() => applyDensityPreset(item)}
                    >
                      {text[densityLabels[item]]}
                    </button>
                  ))}
                </div>
              </div>
              <p className="preset-note">{text.presetNote}</p>
              <div className="sidebar-actions">
                <button type="button" className="action-button" onClick={handleShare}>
                  {text.shareSettings}
                </button>
                <button type="button" className="action-button is-primary" onClick={handleSnapshot}>
                  {text.exportSnapshot}
                </button>
              </div>
              <div className={`status-banner ${statusMessage ? 'is-active' : ''}`} aria-live="polite">
                {statusMessage ?? text.shareHint}
              </div>
            </section>

            <section className="sidebar-section">
              <div className="sidebar-section-header">
                <h2 className="section-heading">{text.parcelSection}</h2>
                <p className="section-copy">{text.parcelCopy}</p>
              </div>
              <div className="control-stack">
                {numericFields
                  .filter((field) => field.section === 'parcel')
                  .map(({ config }) => (
                    <NumericField
                      key={config.key}
                      config={config}
                      value={settings[config.key]}
                      language={language}
                      text={text}
                      onChange={(nextValue) => updateNumericSetting(config.key, nextValue)}
                    />
                  ))}
              </div>
            </section>

            <section className="sidebar-section">
              <div className="sidebar-section-header">
                <h2 className="section-heading">{text.envelopeSection}</h2>
                <p className="section-copy">{text.envelopeCopy}</p>
              </div>
              <div className="control-stack">
                {numericFields
                  .filter((field) => field.section === 'envelope')
                  .map(({ config }) => (
                    <NumericField
                      key={config.key}
                      config={config}
                      value={settings[config.key]}
                      language={language}
                      text={text}
                      onChange={(nextValue) => updateNumericSetting(config.key, nextValue)}
                    />
                  ))}
              </div>
            </section>

            <section className="sidebar-section">
              <div className="sidebar-section-header">
                <h2 className="section-heading">{text.displaySection}</h2>
                <p className="section-copy">{text.displayCopy}</p>
              </div>
              <div className="toggle-grid">
                {toggleFields.map((config) => (
                  <ToggleField
                    key={config.key}
                    config={config}
                    text={text}
                    value={settings[config.key]}
                    onToggle={() => updateToggleSetting(config.key)}
                  />
                ))}
              </div>
            </section>

            <section className="sidebar-section">
              <div className="sidebar-section-header">
                <h2 className="section-heading">{text.liveMetrics}</h2>
              </div>
              <div className="stats-grid stats-grid-sidebar">
                <StatCard
                  label={text.lotDepth}
                  value={formatValue(analysis.lotDepth, language, 'feet', text)}
                  subtext={formatValue(analysis.lotArea, language, 'squareFeet', text)}
                />
                <StatCard
                  label={text.footprintArea}
                  value={formatValue(analysis.footprintArea, language, 'squareFeet', text)}
                  subtext={formatValue(settings.lotCoverage, language, 'percent', text)}
                />
                <StatCard
                  label={text.targetFloorArea}
                  value={formatValue(analysis.targetFloorArea, language, 'squareFeet', text)}
                  subtext={`${text.far} ${formatNumber(settings.far, language, 2)}`}
                />
                <StatCard
                  label={text.achievedFar}
                  value={formatValue(analysis.achievedFar, language, 'ratio', text, 2)}
                  subtext={formatValue(analysis.achievedFloorArea, language, 'squareFeet', text)}
                />
                <StatCard
                  label={text.estimatedStories}
                  value={formatNumber(analysis.estimatedStories, language, 0)}
                  subtext={formatValue(analysis.totalHeight, language, 'feet', text)}
                />
                <StatCard
                  label={text.openSpace}
                  value={formatValue(analysis.openSpaceArea, language, 'squareFeet', text)}
                  subtext={formatValue(analysis.envelopeArea, language, 'squareFeet', text)}
                />
              </div>
            </section>

            <section className="sidebar-section">
              <div className="sidebar-section-header">
                <h2 className="section-heading">{text.warnings}</h2>
              </div>
              <ul className="warning-list">
                {analysis.warnings.length > 0 ? (
                  analysis.warnings.map((warning, index) => (
                    <li key={`${warning.key}-${index}`} className="warning-item" data-level={warning.level}>
                      <WarningCopy warning={warning} text={text} />
                    </li>
                  ))
                ) : (
                  <li className="warning-item" data-level="info">
                    {text.noWarnings}
                  </li>
                )}
              </ul>
            </section>

            <section className="sidebar-section">
              <div className="sidebar-section-header">
                <h2 className="section-heading">{text.quickNotes}</h2>
              </div>
              <ul className="bullet-list">
                {notes.map((note) => (
                  <li key={note} className="bullet-item">
                    {note}
                  </li>
                ))}
              </ul>
            </section>

            <section className="sidebar-section disclaimer-card">
              <h2 className="disclaimer-title">{text.disclaimerTitle}</h2>
              <p className="disclaimer-copy">{text.disclaimerText}</p>
            </section>
          </div>
        </aside>

        <main className="workspace-main">
          <section className="panel scene-workspace">
            <div className="scene-label">
              <span className="scene-label-kicker">{text.sceneLabel}</span>
              <strong className="scene-label-title">{text.sceneTitle}</strong>
            </div>
            <div className="scene-stage scene-stage-workspace" ref={sceneHostRef}>
              <MassingScene settings={deferredSettings} data={sceneData} language={language} text={text} />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
