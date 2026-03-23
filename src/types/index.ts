import { Database } from './supabase'

// ============================================
// Person Entities
// ============================================

/**
 * Represents a full Person row from the database.
 */
export type Person = Database['public']['Tables']['people']['Row']

/**
 * Payload for inserting a new Person into the database.
 */
export type PersonInsert = Database['public']['Tables']['people']['Insert']

/**
 * Payload for updating an existing Person in the database.
 */
export type PersonUpdate = Database['public']['Tables']['people']['Update']

// ============================================
// Team Entities
// ============================================

/**
 * Represents a full Team row from the database.
 */
export type Team = Database['public']['Tables']['teams']['Row']

/**
 * Payload for inserting a new Team into the database.
 */
export type TeamInsert = Database['public']['Tables']['teams']['Insert']

/**
 * Payload for updating an existing Team in the database.
 */
export type TeamUpdate = Database['public']['Tables']['teams']['Update']
