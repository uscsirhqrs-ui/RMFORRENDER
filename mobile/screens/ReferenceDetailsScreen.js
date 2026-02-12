import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { format } from 'date-fns';
import { LucideCalendar, LucideUser, LucideTag, LucideFileText, LucideArrowRight, LucideChevronLeft } from 'lucide-react-native';
import { getGlobalReferenceById, getLocalReferenceById } from '../services/reference.api';

// ─── Status / Priority Badges ──────────────────────────
const Badge = ({ label, bg, color }) => (
    <View style={{ backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, marginRight: 6, marginBottom: 4 }}>
        <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{label}</Text>
    </View>
);

const getStatusStyle = (s) => {
    switch (s?.toLowerCase()) {
        case 'open': return { bg: '#dbeafe', color: '#2563eb' };
        case 'in progress': return { bg: '#fef3c7', color: '#d97706' };
        case 'closed': return { bg: '#d1fae5', color: '#059669' };
        default: return { bg: '#f3f4f6', color: '#6b7280' };
    }
};
const getPriorityStyle = (p) => {
    switch (p?.toLowerCase()) {
        case 'high': case 'urgent': return { bg: '#fee2e2', color: '#dc2626' };
        case 'medium': return { bg: '#fef3c7', color: '#d97706' };
        case 'low': return { bg: '#d1fae5', color: '#059669' };
        default: return { bg: '#f3f4f6', color: '#6b7280' };
    }
};

// ─── Info Row ──────────────────────────────────────────
const InfoRow = ({ icon: Icon, label, value, iconColor = '#2563eb' }) => {
    if (!value) return null;
    return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 }}>
            <View style={{ backgroundColor: '#eff6ff', padding: 7, borderRadius: 16, marginRight: 10 }}>
                <Icon size={15} color={iconColor} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
                <Text style={{ fontSize: 14, color: '#1f2937', marginTop: 1 }}>{value}</Text>
            </View>
        </View>
    );
};

// ─── User Display ──────────────────────────────────────
const getUserDisplay = (user) => {
    if (!user) return 'N/A';
    if (typeof user === 'string') return user;
    const name = user.fullName || user.email || 'Unknown';
    const parts = [name];
    if (user.designation) parts.push(user.designation);
    if (user.labName) parts.push(`(${user.labName})`);
    return parts.join(', ');
};

const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

// ─── Movement Card ─────────────────────────────────────
const MovementCard = ({ movement, isLast }) => {
    const performer = movement.performedByDetails || movement.performedBy;
    const performerName = typeof performer === 'object' ? performer.fullName : performer;
    const performerDesig = typeof performer === 'object' ? performer.designation : null;
    const performerLab = typeof performer === 'object' ? performer.labName : null;
    const markedToList = Array.isArray(movement.markedToDetails) ? movement.markedToDetails : [];
    const statusStyle = getStatusStyle(movement.statusOnMovement);
    const initials = getInitials(performerName);
    const date = movement.movementDate || movement.createdAt;

    return (
        <View style={{ flexDirection: 'row', marginBottom: 0 }}>
            {/* Timeline line + avatar */}
            <View style={{ alignItems: 'center', width: 48 }}>
                <View style={{
                    width: 40, height: 40, borderRadius: 20,
                    backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center',
                }}>
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>{initials}</Text>
                </View>
                {!isLast && (
                    <View style={{ width: 2, flex: 1, backgroundColor: '#e5e7eb', marginVertical: 4 }} />
                )}
            </View>

            {/* Content */}
            <View style={{ flex: 1, marginLeft: 12, paddingBottom: isLast ? 0 : 20 }}>
                {/* Header row */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '700', color: '#1f2937', fontSize: 14 }}>{performerName || 'Unknown'}</Text>
                        {(performerDesig || performerLab) && (
                            <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 1 }}>
                                {[performerDesig, performerLab ? `(${performerLab})` : null].filter(Boolean).join(', ')}
                            </Text>
                        )}
                    </View>
                    <Text style={{ color: '#9ca3af', fontSize: 11 }}>
                        {date ? format(new Date(date), 'MMM d, yyyy') : ''}
                    </Text>
                </View>

                {/* Status badge */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusStyle.color, marginRight: 6 }} />
                    <Text style={{ color: statusStyle.color, fontSize: 12, fontWeight: '600' }}>{movement.statusOnMovement || 'N/A'}</Text>
                </View>

                {/* Next marked to */}
                {markedToList.length > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
                        <Text style={{ color: '#9ca3af', fontSize: 12 }}>Next marked to: </Text>
                        {markedToList.map((u, i) => (
                            <Text key={u._id || i} style={{ color: '#4f46e5', fontSize: 12, fontWeight: '500' }}>
                                {getUserDisplay(u)}{i < markedToList.length - 1 ? ', ' : ''}
                            </Text>
                        ))}
                    </View>
                )}

                {/* Remarks */}
                {movement.remarks && (
                    <View style={{ backgroundColor: '#f9fafb', borderRadius: 8, padding: 10, marginTop: 8 }}>
                        <Text style={{ color: '#4b5563', fontSize: 13, lineHeight: 18 }}>{movement.remarks}</Text>
                    </View>
                )}
            </View>
        </View>
    );
};

// ─── Main Screen ───────────────────────────────────────
const ReferenceDetailsScreen = ({ route, navigation }) => {
    const { reference: initialRef } = route.params;
    const [reference, setReference] = useState(initialRef);
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);
    const refType = initialRef.refId?.startsWith('GREF') ? 'global' : 'local';

    useEffect(() => {
        fetchDetails();
    }, []);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            const response = refType === 'global'
                ? await getGlobalReferenceById(initialRef._id)
                : await getLocalReferenceById(initialRef._id);

            if (response.success) {
                setReference(response.data.reference || response.data);
                setMovements(response.data.movements || []);
            } else {
                Alert.alert('Error', response.message || 'Failed to load details');
            }
        } catch (err) {
            console.error('[RefDetails] Error:', err);
        }
        setLoading(false);
    };

    const statusStyle = getStatusStyle(reference.status);
    const priorityStyle = getPriorityStyle(reference.priority);

    const createdBy = reference.createdByDetails || reference.createdBy;
    const markedTo = Array.isArray(reference.markedToDetails) ? reference.markedToDetails : [reference.markedToDetails || reference.markedTo].filter(Boolean);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
                <ActivityIndicator size="large" color="#4f46e5" />
            </View>
        );
    }

    return (
        <ScrollView style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
            {/* ─── Header ─────────────────────── */}
            <View style={{ backgroundColor: '#4f46e5', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 }}>
                <Text style={{ color: '#ffffff', fontSize: 20, fontWeight: 'bold' }}>
                    {reference.subject || 'Untitled'}
                </Text>

                {/* Meta row */}
                <View style={{ flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' }}>
                    <View style={{ marginRight: 16 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, textTransform: 'uppercase' }}>Reference ID</Text>
                        <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '600' }}>{reference.refId || 'N/A'}</Text>
                    </View>
                    {reference.deliveryMode && (
                        <View style={{ marginRight: 16 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, textTransform: 'uppercase' }}>Mode Sent</Text>
                            <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '600' }}>{reference.deliveryMode}</Text>
                        </View>
                    )}
                    {reference.eofficeNo && (
                        <View>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, textTransform: 'uppercase' }}>E-Office No</Text>
                            <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '600' }}>{reference.eofficeNo}</Text>
                        </View>
                    )}
                </View>

                {/* Badges */}
                <View style={{ flexDirection: 'row', marginTop: 12, flexWrap: 'wrap' }}>
                    <Badge label={reference.status || 'Unknown'} bg={statusStyle.bg} color={statusStyle.color} />
                    <Badge label={reference.priority || 'Normal'} bg={priorityStyle.bg} color={priorityStyle.color} />
                    <Badge label={refType === 'global' ? 'GLOBAL REF' : 'LOCAL REF'} bg="#fce7f3" color="#db2777" />
                </View>
            </View>

            {/* ─── Reference Details Card ────── */}
            <View style={{ margin: 16, backgroundColor: '#ffffff', borderRadius: 12, padding: 18, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 }}>
                {/* Latest Remarks */}
                {reference.remarks && (
                    <View style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Latest Remarks</Text>
                        <Text style={{ fontSize: 14, color: '#1f2937', lineHeight: 20 }}>{reference.remarks}</Text>
                    </View>
                )}

                <InfoRow icon={LucideCalendar} label="Created" value={reference.createdAt ? format(new Date(reference.createdAt), 'dd/MM/yyyy') : null} />
                <InfoRow icon={LucideUser} label="Created By" value={getUserDisplay(createdBy)} />
                <InfoRow icon={LucideUser} label="Currently Marked To" value={markedTo.map(getUserDisplay).join('\n')} iconColor="#059669" />
                {reference.eofficeNo && <InfoRow icon={LucideFileText} label="E-Office No" value={reference.eofficeNo} />}
                {reference.deliveryMode && <InfoRow icon={LucideTag} label="Delivery Mode" value={reference.deliveryMode} />}

                {/* Update Button */}
                <TouchableOpacity
                    style={{
                        backgroundColor: '#4f46e5',
                        paddingVertical: 14,
                        borderRadius: 10,
                        alignItems: 'center',
                        marginTop: 8,
                    }}
                    onPress={() => navigation.navigate('UpdateReference', {
                        reference,
                        refType,
                        onUpdated: fetchDetails,
                    })}
                >
                    <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 16 }}>UPDATE REFERENCE</Text>
                </TouchableOpacity>

                <Text style={{ color: '#d97706', fontSize: 11, textAlign: 'center', marginTop: 8, fontStyle: 'italic' }}>
                    Update button will be enabled only if the reference is currently assigned to you
                </Text>
            </View>

            {/* ─── Movement Flow ─────────────── */}
            <View style={{ marginHorizontal: 16, marginBottom: 24 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 }}>Movement Flow</Text>
                <Text style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>Chronological history of the reference.</Text>

                {movements.length === 0 ? (
                    <View style={{ backgroundColor: '#ffffff', borderRadius: 12, padding: 24, alignItems: 'center', elevation: 1 }}>
                        <Text style={{ color: '#9ca3af', fontStyle: 'italic' }}>No movements recorded</Text>
                    </View>
                ) : (
                    <View style={{ backgroundColor: '#ffffff', borderRadius: 12, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 }}>
                        {movements.map((m, idx) => (
                            <MovementCard key={m._id || idx} movement={m} isLast={idx === movements.length - 1} />
                        ))}
                    </View>
                )}
            </View>
        </ScrollView>
    );
};

export default ReferenceDetailsScreen;
