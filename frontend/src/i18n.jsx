/**
 * i18n.jsx — Language support for Smart Granite (English & Telugu)
 * Comprehensive AP Mines & Geology bilingual dictionary with persistent state.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export const TELUGU_DICTIONARY = {
  // ── Branding & Header ──────────────────────────────────────────────
  'Smart Granite': 'స్మార్ట్ గ్రానైట్',
  'AP Mines & Geology': 'ఆంధ్రప్రదేశ్ గనులు & భూగర్భ శాఖ',
  'AP Mines': 'ఏపీ గనులు',
  'Government of Andhra Pradesh': 'ఆంధ్రప్రదేశ్ ప్రభుత్వం',
  'AI Help': 'AI సహాయం',
  'AI Assistant & Command Center': 'AI అసిస్టెంట్ & కమాండ్ సెంటర్',
  'AI Command Center': 'AI కమాండ్ సెంటర్',
  'Clear Chat': 'చాట్ క్లియర్ చేయండి',
  'Send': 'పంపండి',
  'Thinking...': 'ఆలోచిస్తోంది...',
  'Sign Out': 'లాగ్ అవుట్',
  'Logout': 'లాగ్ అవుట్',
  'Login': 'లాగిన్',
  'Signed in as': 'లాగిన్ అయిన ఖాతా',
  'Role': 'పాత్ర',
  'Collapse': 'కుదించు',
  'Expand': 'విస్తరించు',
  'Search': 'శోధించండి',
  'Filter': 'ఫిల్టర్',
  'Submit': 'సమర్పించండి',
  'Approve': 'ఆమోదించండి',
  'Reject': 'తిరస్కరించండి',
  'Save': 'భద్రపరచండి',
  'Cancel': 'రద్దు చేయండి',
  'Download': 'డౌన్‌లోడ్',
  'Export': 'ఎగుమతి',
  'View Details': 'వివరాలు చూడండి',
  'Back': 'వెనుకకు',
  'Actions': 'చర్యలు',
  'Date': 'తేదీ',
  'Time': 'సమయం',

  // ── Roles & Panels ──────────────────────────────────────────────────
  'operator': 'క్వారీ ఆపరేటర్',
  'dmgo': 'DMGO అధికారి',
  'weighbridge': 'వేబ్రిడ్జ్ ఆపరేటర్',
  'admin': 'అడ్మినిస్ట్రేటర్',
  'enforcement': 'విజిలెన్స్ / ఎన్‌ఫోర్స్‌మెంట్',
  'OPERATOR PANEL': 'ఆపరేటర్ ప్యానెల్',
  'DMGO PANEL': 'DMGO ప్యానెల్',
  'WEIGHBRIDGE PANEL': 'వేబ్రిడ్జ్ ప్యానెల్',
  'ADMIN PANEL': 'అడ్మిన్ ప్యానెల్',
  'ENFORCEMENT PANEL': 'ఎన్‌ఫోర్స్‌మెంట్ ప్యానెల్',

  // ── Navigation & Breadcrumbs ─────────────────────────────────────────
  'Dashboard': 'డాష్‌బోర్డ్',
  'Overview': 'సమీక్ష',
  'GIS Quarry Map': 'GIS క్వారీ మ్యాప్',
  'AP Quarry Map': 'AP క్వారీ మ్యాప్',
  'Block Queue': 'బ్లాక్ క్యూ',
  'All Blocks': 'అన్ని బ్లాక్‌లు',
  'My Blocks': 'నా బ్లాక్‌లు',
  'Blocks': 'బ్లాక్‌లు',
  'Quarries Registry': 'క్వారీల రిజిస్ట్రీ',
  'Quarries': 'క్వారీలు',
  'Quarry Management': 'క్వారీ నిర్వహణ',
  'e-Permits': 'ఇ-పర్మిట్లు',
  'Permits': 'పర్మిట్లు',
  'Field Audits': 'ఫీల్డ్ ఆడిట్లు',
  'Inspections': 'తనిఖీలు',
  'Revenue & Cess': 'ఆదాయం & సెస్',
  'Checkposts': 'చెక్ పోస్టులు',
  'Reports': 'నివేదికలు',
  'Audit Logs': 'ఆడిట్ లాగ్స్',
  'Track Any Block': 'బ్లాక్ ట్రాక్ చేయండి',
  'Public Track Status': 'పబ్లిక్ ట్రాకింగ్ స్థితి',
  'Capture Block': 'బ్లాక్ క్యాప్చర్',
  'Dispatch': 'రవాణా',
  'Royalty Calculator': 'రాయల్టీ కాలిక్యులేటర్',
  'Lease Compliance': 'లీజు నిబంధనలు',
  'Upload History': 'అప్‌లోడ్ చరిత్ర',
  'Weight Entry': 'బరువు నమోదు',
  'History': 'చరిత్ర',
  'User Management': 'వినియోగదారుల నిర్వహణ',
  'Users': 'వినియోగదారులు',
  'Weighbridge': 'వేబ్రిడ్జ్',
  'Seigniorage': 'సీనియరేజ్',
  'System Settings': 'సిస్టమ్ సెట్టింగ్స్',
  'Settings': 'సెట్టింగ్స్',
  'Scan Block': 'బ్లాక్ స్కాన్',
  'Vehicle Lookup': 'వాహన శోధన',
  'Flagged Log': 'ఫ్లాగ్ చేసిన లాగ్',
  'Enforcement': 'ఎన్‌ఫోర్స్‌మెంట్',

  // ── AI Command Center ───────────────────────────────────────────────
  'Natural language interface with real-time AP Mines & Geology database access': 'నిజ-సమయ ఆంధ్రప్రదేశ్ గనుల డేటాబేస్ యాక్సెస్‌తో సహజ భాషా ఇంటర్‌ఫేస్',
  'Suggested Queries for': 'సూచించిన ప్రశ్నలు:',
  'SUGGESTED QUERIES FOR DMGO': 'DMGO కోసం సూచించిన ప్రశ్నలు',
  'SUGGESTED QUERIES FOR OPERATOR': 'ఆపరేటర్ కోసం సూచించిన ప్రశ్నలు',
  'SUGGESTED QUERIES FOR WEIGHBRIDGE': 'వేబ్రిడ్జ్ కోసం సూచించిన ప్రశ్నలు',
  'SUGGESTED QUERIES FOR ENFORCEMENT': 'ఎన్‌ఫోర్స్‌మెంట్ కోసం సూచించిన ప్రశ్నలు',
  'SUGGESTED QUERIES FOR ADMIN': 'అడ్మిన్ కోసం సూచించిన ప్రశ్నలు',
  'Pending Approvals': 'పెండింగ్ ఆమోదాలు',
  'Flagged Blocks': 'ఫ్లాగ్ చేసిన బ్లాక్‌లు',
  'Revenue Summary': 'ఆదాయ సారాంశం',
  'Weighbridge Issues': 'వేబ్రిడ్జ్ సమస్యలు',
  'Top Quarries': 'ప్రధాన క్వారీలు',
  'OMEPS Sync Status': 'OMEPS సింక్ స్థితి',
  'Capture Help': 'క్యాప్చర్ సహాయం',
  'Gangsaw Rules': 'గ్యాంగ్‌సా నిబంధనలు',
  'Dispatch Process': 'రవాణా ప్రక్రియ',
  'Pit Face Uploads': 'పిట్ ఫేస్ అప్‌లోడ్లు',
  'My Flagged Blocks': 'నా ఫ్లాగ్డ్ బ్లాక్‌లు',
  'Seigniorage Rates': 'సీనియరేజ్ రేట్లు',
  'Gross & Tare Entry': 'స్థూల & నికర నమోదు',
  '5% Discrepancy Rule': '5% వ్యత్యాస నియమం',
  'Flagged Vehicles': 'ఫ్లాగ్ చేసిన వాహనాలు',
  'Transit Pass Check': 'రవాణా పాస్ తనిఖీ',
  'Active Dispatches': 'క్రియాశీల రవాణాలు',
  'Roadside Inspection': 'రోడ్‌సైడ్ తనిఖీ',
  'QR Code Verification': 'QR కోడ్ ధృవీకరణ',
  'Flagged Transits': 'ఫ్లాగ్ చేసిన రవాణాలు',
  'Seizure Protocol': 'జప్తు ప్రక్రియ',
  'Vehicle Search': 'వాహన శోధన',
  'Pending Approval': 'పెండింగ్ ఆమోదం',
  'In Transit': 'రవాణాలో ఉన్నవి',
  'Super Gangsaw': 'సూపర్ గ్యాంగ్‌సా',
  'OMEPS Status': 'OMEPS స్థితి',
  'Powered by Gemini AI · Context-grounded with live AP Granite lifecycle data': 'జెమిని AI ద్వారా నడపబడుతోంది · లైవ్ AP గ్రానైట్ లైఫ్‌సైకిల్ డేటా',
  'Ask anything as': 'సందేహాలు అడగండి',

  // ── Statuses & Measurements ────────────────────────────────────────
  'Statutory e-Transit Passes': 'చట్టబద్ధమైన ఇ-రవాణా పాస్‌లు',
  'Active Passes': 'క్రియాశీల పాస్‌లు',
  'Ready for Permit': 'పర్మిట్‌కు సిద్ధం',
  'Completed Transits': 'పూర్తయిన రవాణాలు',
  'Permit Seigniorage': 'పర్మిట్ సీనియరేజ్',
  'All Permits': 'అన్ని పర్మిట్లు',
  'Ready to Issue': 'జారీకి సిద్ధం',
  'Verified': 'ధృవీకరించబడింది',
  'e-Permit ID': 'ఇ-పర్మిట్ ID',
  'Quarry / Lessee': 'క్వారీ / లీజుదారు',
  'Variety & Volume': 'రకం & పరిమాణం',
  'Assigned Vehicle': 'కేటాయించిన వాహనం',
  'Destination': 'గమ్యస్థానం',
  'Action': 'చర్య',
  'View Pass': 'పాస్ చూడండి',
  'Issue e-Permit': 'ఇ-పర్మిట్ జారీ',
  'Refresh': 'రిఫ్రెష్',
  'En route on state highways': 'రాష్ట్ర రహదారులపై రవాణాలో ఉంది',
  'DMGO verified, awaiting transport': 'DMGO ధృవీకరించింది, రవాణా నిరీక్షణ',
  'Cross-checked at weighbridge': 'వేబ్రిడ్జ్ వద్ద సరిచూడబడింది',
  '100% digital collection': '100% డిజిటల్ వసూలు',
  'Search permit, vehicle, quarry...': 'పర్మిట్, వాహనం, క్వారీ శోధించండి...',
  'Not Assigned': 'కేటాయించలేదు',
  'Registered': 'నమోదైంది',
  'Undressed': 'అన్‌డ్రెస్డ్',
  'Dressed': 'డ్రెస్డ్',
  'AI Measured': 'AI కొలిచింది',
  'Pending DMGO': 'DMGO పెండింగ్',
  'Approved': 'ఆమోదించబడింది',
  'Rejected': 'తిరస్కరించబడింది',
  'Permit Ready': 'పర్మిట్ సిద్ధం',
  'Dispatch Req.': 'రవాణా కోరబడింది',
  'Dispatched': 'పంపబడింది',
  'WB Verified': 'WB ధృవీకరించబడింది',
  'WB Flagged': 'WB ఫ్లాగ్ చేయబడింది',
  'WB Approved': 'WB ఆమోదించబడింది',
  'Pending': 'పెండింగ్',
  'Flagged': 'ఫ్లాగ్ చేయబడింది',
  'Status': 'స్థితి',
  'Volume': 'వాల్యూమ్ (m³)',
  'Weight': 'బరువు (MT)',
  'Length': 'పొడవు',
  'Breadth': 'వెడల్పు',
  'Height': 'ఎత్తు',
  'Quarry': 'క్వారీ',
  'Quarry Name': 'క్వారీ పేరు',
  'Block ID': 'బ్లాక్ ID',
  'Vehicle No': 'వాహనం నం.',
  'Vehicle Number': 'వాహనం నంబర్',
  'Color': 'రంగు',
  'Granite Type': 'గ్రానైట్ రకం',
  'District': 'జిల్లా',
  'Mandal': 'మండలం',
  'Village': 'గ్రామం',
  'Total Blocks': 'మొత్తం బ్లాక్‌లు',
  'Total Revenue': 'మొత్తం ఆదాయం',
  'Total Volume': 'మొత్తం వాల్యూమ్',
  'Total Weight': 'మొత్తం బరువు',
  'Flagged Variance': 'ఫ్లాగ్డ్ వ్యత్యాసం',
  'Total Seigniorage': 'మొత్తం సీనియరేజ్',
  'Active Leases': 'క్రియాశీల లీజులు',
  'Transit Passes': 'రవాణా పాస్‌లు',
  'Total E-Permits': 'మొత్తం ఇ-పర్మిట్లు',

  // ── Operator Capture Block (Undressed & Dressed) ────────────────────
  'Granite Block Categorization & Registration': 'గ్రానైట్ బ్లాక్ వర్గీకరణ & నమోదు',
  'AP DMG Registry Flow': 'AP DMG రిజిస్ట్రీ ప్రక్రియ',
  'Quarry #': 'క్వారీ #',
  'Record raw blasted blocks from the quarry pit or measure dressed rectangular blocks for DMGO check inspection.': 'క్వారీ పిట్ నుండి ముడి బ్లాక్‌లను నమోదు చేయండి లేదా DMGO తనిఖీ కోసం డ్రెస్డ్ దీర్ఘచతురస్రాకార బ్లాక్‌లను కొలవండి.',
  'Undressed Block': 'ముడి రాయి (అన్‌డ్రెస్డ్)',
  'Phase 1: Pit Excavation': 'దశ 1: పిట్ తవ్వకం',
  'Newly blasted / split raw rough block. Record largest bounding edges (L, B, H in cm), quarry GPS & pit photo.': 'కొత్తగా పేల్చిన / కత్తిరించిన ముడి రాయి. అత్యధిక అంచుల కొలతలు (పొడవు, వెడల్పు, ఎత్తు సెం.మీ లలో), GPS & ఫోటో నమోదు చేయండి.',
  'Dressed Block': 'డ్రెస్డ్ బ్లాక్',
  'Phase 2: Dressing Yard AI': 'దశ 2: డ్రెస్సింగ్ యార్డ్ AI',
  'Trimmed rectangular block for DMGO check measurement. Multi-view AI photogrammetry (4 readings per dimension).': 'DMGO తనిఖీ కోసం చదును చేసిన బ్లాక్. మల్టీ-వ్యూ AI ఫోటోగ్రామెట్రీ (ప్రతి కొలతకు 4 రీడింగ్‌లు).',
  
  // Undressed Form
  'Register Raw Undressed Block (Pit Extraction)': 'ముడి రాయి నమోదు (పిట్ తవ్వకం)',
  'AP Mines & Geology Department Rule: Measure the single largest edge along each axis.': 'ఏపీ గనుల శాఖ నిబంధన: ప్రతి అక్షం వెంబడి అతిపెద్ద అంచును మాత్రమే కొలవండి.',
  'Demo Pit Photo': 'డెమో పిట్ ఫోటో',
  '⚡ Demo Pit Photo': '⚡ డెమో పిట్ ఫోటో',
  'Pit Extraction Protocol: Every granite block severed from the face must be assigned a unique government UD-ID with raw pit bounding dimensions before moving to the dressing yard.': 'పిట్ వెలికితీత నియమావళి: డ్రెస్సింగ్ యార్డ్‌కు తరలించే ముందు ప్రతి ముడి రాయికి ప్రభుత్వం కేటాయించే ప్రత్యేక UD-ID మరియు ముడి కొలతలు తప్పనిసరిగా నమోదు చేయాలి.',
  'Pit Extraction Protocol:': 'పిట్ వెలికితీత నియమావళి:',
  'Quarry Identification': 'క్వారీ గుర్తింపు',
  'Mineral Granite Type': 'గ్రానైట్ ఖనిజ రకం',
  'Raw Bounding Dimensions (Single Largest Edge Measurement)': 'ముడి కొలతలు (అతిపెద్ద అంచు కొలత)',
  'Length (cm)': 'పొడవు (సెం.మీ)',
  'Breadth (cm)': 'వెడల్పు (సెం.మీ)',
  'Height (cm)': 'ఎత్తు (సెం.మీ)',
  'Raw Estimated Volume': 'అంచనా వేసిన ముడి ఘనపరిమాణం',
  'Estimated Raw Weight': 'అంచనా వేసిన ముడి బరువు',
  'Expected Slab Tier': 'ఆశించిన స్లాబ్ శ్రేణి',
  'Below Gangsaw': 'బిలో గ్యాంగ్‌సా',
  'Above Gangsaw': 'ఎబవ్ గ్యాంగ్‌సా',
  'Super Gangsaw': 'సూపర్ గ్యాంగ్‌సా',
  'Quarry Pit Face Photograph': 'క్వారీ పిట్ ఫేస్ ఫోటోగ్రాఫ్',
  'Upload Pit Photo': 'పిట్ ఫోటో అప్‌లోడ్ చేయండి',
  'or click "⚡ Demo Pit Photo" above': 'లేదా పైన ఉన్న "⚡ డెమో పిట్ ఫోటో" క్లిక్ చేయండి',
  '✓ Pit Photo Attached': '✓ పిట్ ఫోటో జోడించబడింది',
  'Quarry GPS Coordinates': 'క్వారీ GPS కోఆర్డినేట్లు',
  'GPS OK': 'GPS సక్రమం',
  'Default': 'డిఫాల్ట్',
  'Coordinates will be stamped onto the blockchain audit log for mining provenance.': 'మైనింగ్ రికార్డు మరియు బ్లాక్‌చెయిన్ ఆడిట్ కోసం GPS కోఆర్డినేట్లు భద్రపరచబడతాయి.',
  'Register Undressed Block (Assign UD-ID)': 'ముడి రాయిని నమోదు చేయండి (UD-ID కేటాయించండి)',
  'Registering Undressed Block…': 'ముడి రాయిని నమోదు చేస్తోంది…',
  
  // Granite Types
  'Black Galaxy Granite': 'బ్లాక్ గెలాక్సీ గ్రానైట్',
  'Black Granite (Other)': 'బ్లాక్ గ్రానైట్ (ఇతర)',
  'Srikakulam Blue': 'శ్రీకాకుళం బ్లూ',
  'Moon White': 'మూన్ వైట్',
  'River White': 'రివర్ వైట్',
  'Steel Grey': 'స్టీల్ గ్రే',
  'Forest Green': 'ఫారెస్ట్ గ్రీన్',
  'Others': 'ఇతరములు',

  // Undressed Success
  'Undressed Block Registered!': 'ముడి రాయి విజయవంతంగా నమోదైంది!',
  'The raw extracted granite block has been successfully registered in the AP Mines inventory. System has assigned an immutable Undressed Block identifier.': 'తవ్వి తీసిన ముడి గ్రానైట్ రాయి ఏపీ గనుల ఇన్వెంటరీలో విజయవంతంగా నమోదైంది. సిస్టమ్ ప్రత్యేక UD-IDని కేటాయించింది.',
  'Government Undressed Block ID': 'ప్రభుత్వ ముడి రాయి ID (UD-ID)',
  'Internal Reference:': 'అంతర్గత రిఫరెన్స్:',
  'Internal Reference': 'అంతర్గత రిఫరెన్స్',
  'Raw Volume:': 'ముడి ఘనపరిమాణం:',
  'AP DMG Orientation Next Step:': 'తదుపరి దశ మార్గదర్శకం:',
  'When this block is dressed in the yard, use "Dressed Block" to capture multi-view photogrammetric photos. Selecting this Undressed ID preserves the chain of custody and proves dressing yield.': 'ఈ రాయిని యార్డులో డ్రెస్సింగ్ చేసినప్పుడు, "డ్రెస్డ్ బ్లాక్" ఎంచుకుని బహుళ-కోణాల ఫోటోలు తీయండి. ఈ UD-IDని ఎంచుకోవడం ద్వారా లీజుదారు హక్కులు మరియు రికార్డులు భద్రంగా ఉంటాయి.',
  'Dress & Measure This Block Now →': 'ఈ బ్లాక్‌ను డ్రెస్సింగ్ చేసి కొలవండి →',
  'Track UD Lifecycle': 'UD స్థితిని ట్రాక్ చేయండి',
  'View in Blocks List': 'బ్లాక్‌ల జాబితాలో చూడండి',
  'Register Another': 'మరొకటి నమోదు చేయండి',

  // Dressed Flow Wizard
  'Photos': 'ఫోటోలు',
  'Details': 'వివరాలు',
  'Review & AI Measure': 'సమీక్ష & AI కొలత',
  'AP DMG Provenance: Converted from an Undressed Block?': 'AP DMG ధృవీకరణ: ముడి రాయి నుండి తయారు చేయబడిందా?',
  'Link Raw Source Block': 'ముడి సోర్స్ బ్లాక్‌ను లింక్ చేయండి',
  'No active undressed blocks found for Quarry #': 'క్వారీ కోసం ఎటువంటి ముడి బ్లాక్‌లు కనుగొనబడలేదు #',
  '-- Select Source Undressed Block --': '-- సోర్స్ ముడి రాయిని ఎంచుకోండి --',
  'Source UD ID:': 'సోర్స్ UD ID:',
  'Source UD ID': 'సోర్స్ UD ID',
  'Raw Dimensions:': 'ముడి కొలతలు:',
  'Raw Volume:': 'ముడి పరిమాణం:',
  'Chain of Custody Active': 'కస్టడీ చైన్ యాక్టివ్‌గా ఉంది',
  'Upload Dressed Block Photographs (Photogrammetric Protocol)': 'డ్రెస్డ్ బ్లాక్ ఫోటోలను అప్‌లోడ్ చేయండి (ఫోటోగ్రామెట్రిక్ ప్రోటోకాల్)',
  'Provide standardized multi-view images (minimum 3 views) for AI 4-reading photogrammetry.': 'AI 4-రీడింగ్ ఫోటోగ్రామెట్రీ కోసం ప్రామాణిక బహుళ-కోణాల చిత్రాలను (కనీసం 3 కోణాలు) అందించండి.',
  '⚡ Demo Auto-Fill': '⚡ డెమో ఆటో-ఫిల్',
  'Front Face': 'ముందు వైపు',
  'Breadth View 1': 'వెడల్పు వీక్షణ 1',
  'Left Side': 'ఎడమ వైపు',
  'Length View 1': 'పొడవు వీక్షణ 1',
  'Right Side': 'కుడి వైపు',
  'Length View 2': 'పొడవు వీక్షణ 2',
  'Rear Face': 'వెనుక వైపు',
  'Breadth View 2': 'వెడల్పు వీక్షణ 2',
  'Top Face': 'పై వైపు',
  'Confirmation': 'ధృవీకరణ',
  '✓ UPLOADED': '✓ అప్‌లోడ్ అయ్యింది',
  'REQUIRED': 'తప్పనిసరి',
  'of': 'లో',
  'required views uploaded': 'తప్పనిసరి కోణాలు అప్‌లోడ్ అయ్యాయి',
  'Next: Block Details': 'తరువాత: బ్లాక్ వివరాలు',
  'Dressed Block Specifications': 'డ్రెస్డ్ బ్లాక్ స్పెసిఫికేషన్లు',
  'Granite Mineral Type': 'గ్రానైట్ ఖనిజ రకం',
  'Internal Leaseholder / Dressing Yard Tag': 'లీజుదారు అంతర్గత / యార్డ్ ట్యాగ్',
  'Dressing Yard GPS Coordinates': 'డ్రెస్సింగ్ యార్డ్ GPS కోఆర్డినేట్లు',
  '← Back': '← వెనుకకు',
  'Review & AI Analysis': 'సమీక్ష & AI విశ్లేషణ',
  'Review & Run Multi-View AI Photogrammetry': 'సమీక్షించి మల్టీ-వ్యూ AI ఫోటోగ్రామెట్రీ అమలు చేయండి',
  'Source Undressed ID': 'సోర్స్ అన్‌డ్రెస్డ్ ID',
  'Yard Marking': 'యార్డ్ మార్కింగ్',
  'GPS Stamp': 'GPS స్టాంప్',
  'None': 'ఏదీ లేదు',
  'Standalone Dressed': 'స్వతంత్ర డ్రెస్డ్ రాయి',
  'Calculating Photogrammetric AI Dimensions…': 'ఫోటోగ్రామెట్రిక్ AI కొలతలను లెక్కిస్తోంది…',
  'Register & Run AI Measurement': 'నమోదు చేసి AI కొలత అమలు చేయండి',

  // Dressed Success & Cuboid Geometry
  'Dressed Block Registered & AI Measured!': 'డ్రెస్డ్ బ్లాక్ నమోదైంది & AI కొలిచింది!',
  'Multi-view photogrammetry complete. The block has been assigned a commercial BLK ID and 4-reading dimensions are logged.': 'మల్టీ-వ్యూ ఫోటోగ్రామెట్రీ పూర్తయింది. బ్లాక్‌కు వాణిజ్య BLK ID కేటాయించబడింది మరియు 4-రీడింగ్ కొలతలు నమోదు చేయబడ్డాయి.',
  'Commercial Dressed Block ID': 'వాణిజ్య డ్రెస్డ్ బ్లాక్ ID',
  '🔗 Provenance Linked: Source Undressed ID': '🔗 సోర్స్ అన్‌డ్రెస్డ్ ID అనుసంధానించబడింది',
  'Ready for DMGO Check Measurement:': 'DMGO చెక్ కొలతకు సిద్ధంగా ఉంది:',
  'You can now select this block from the Granite Blocks list and click "Raise DMGO Request" for district verification.': 'మీరు ఇప్పుడు గ్రానైట్ బ్లాక్‌ల జాబితా నుండి ఈ బ్లాక్‌ను ఎంచుకుని, జిల్లా ధృవీకరణ కోసం "DMGO అభ్యర్థనను పంపండి" క్లిక్ చేయవచ్చు.',
  'Track Digital Lifecycle Status': 'డిజిటల్ లైఫ్‌సైకిల్ స్థితిని ట్రాక్ చేయండి',
  'Register Another Dressed Block': 'మరొక డ్రెస్డ్ బ్లాక్‌ను నమోదు చేయండి',
  'Cuboid Geometry & Volumetric Metrics': 'క్యూబాయిడ్ జ్యామితి & పరిమాణ కొలమానాలు',
  'Space / Body Diagonal': 'బాడీ / స్పేస్ వికర్ణం (డయాగోనల్)',
  'Base Face Diagonal': 'బేస్ ఫేస్ వికర్ణం',
  'Surface Area': 'ఉపరితల వైశాల్యం',
  'Surface to Volume Ratio': 'ఉపరితల-పరిమాణ నిష్పత్తి',
  'Dressing Recovery Yield': 'డ్రెస్సింగ్ రికవరీ దిగుబడి',
  'Volume Trimmed / Lost': 'తగ్గిన / కత్తిరించిన పరిమాణం',
  'Quarry Dressing Waste': 'క్వారీ డ్రెస్సింగ్ వ్యర్థం',
  'Source Undressed Volume': 'సోర్స్ అన్‌డ్రెస్డ్ పరిమాణం',
  'Final Dressed Volume': 'తుది డ్రెస్డ్ పరిమాణం',
  'Volume Difference': 'పరిమాణ వ్యత్యాసం',
};

export const ROLE_GREETINGS_TE = {
  operator: "నమస్తే! నేను మీ క్వారీ ఆపరేటర్ AI అసిస్టెంట్‌ని. బ్లాక్ క్యాప్చర్ మార్గదర్శకాలు, కొలతల ప్రమాణాలు, పిట్-ఫేస్ లాగింగ్ మరియు రవాణా అనుమతుల్లో మీకు సహాయపడగలను.",
  dmgo: "నమస్తే అధికారి గారు! నేను మీ DMGO AI అసిస్టెంట్‌ని. బ్లాక్ ఆమోదాలు, బరువు వ్యత్యాసాల ఆడిట్, సీనియరేజ్ ఆదాయ నివేదికలు మరియు క్వారీ నిబంధనల పరిశీలనలో మీకు సహాయపడగలను.",
  weighbridge: "నమస్తే! నేను మీ వేబ్రిడ్జ్ ఆపరేషన్స్ AI అసిస్టెంట్‌ని. స్థూల/నికర బరువు నమోదు, బరువు వ్యత్యాస నిబంధనలు మరియు రవాణా పాస్ ధృవీకరణలో సహాయపడతాను.",
  enforcement: "నమస్తే అధికారి గారు! నేను మీ రోడ్డు విజిలెన్స్ AI అసిస్టెంట్‌ని. సెక్షన్ 21 MMDR నిబంధనలు, రోడ్‌సైడ్ తనిఖీలు, QR ధృవీకరణ మరియు జప్తు ప్రక్రియలో మీకు సహాయపడగలను.",
  admin: "నమస్తే! నేను మీ స్మార్ట్ గ్రానైట్ AI కమాండ్ సెంటర్. ఆంధ్రప్రదేశ్ వ్యాప్తంగా ఉన్న అన్ని క్వారీ, బ్లాక్, రవాణా, వేబ్రిడ్జ్ మరియు సీనియరేజ్ సమాచారాన్ని అందించగలను.",
};

const LanguageContext = createContext({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
  transliterate: (text) => text,
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem('smart_granite_lang') || 'en';
    } catch {
      return 'en';
    }
  });

  const setLang = useCallback((newLangOrUpdater) => {
    setLangState((prev) => {
      const next = typeof newLangOrUpdater === 'function' ? newLangOrUpdater(prev) : newLangOrUpdater;
      try {
        localStorage.setItem('smart_granite_lang', next);
      } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback((key) => {
    if (!key || lang === 'en') return key;
    const str = String(key).trim();
    if (TELUGU_DICTIONARY[str]) return TELUGU_DICTIONARY[str];
    
    // Case-insensitive fallback
    const lowerKey = str.toLowerCase();
    for (const [k, v] of Object.entries(TELUGU_DICTIONARY)) {
      if (k.toLowerCase() === lowerKey) return v;
    }
    return key;
  }, [lang]);

  const transliterate = useCallback((text) => {
    if (!text || lang === 'en') return text;
    return t(text);
  }, [lang, t]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, transliterate }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
