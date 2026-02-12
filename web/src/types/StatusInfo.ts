/**
 * @fileoverview Source File - Part of the application codebase
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import type { ReactNode } from 'react';

export default interface StatusInfo {
    title: string;
    refcount?: number;
    iconUrl?: string;
    icon?: ReactNode;
}
