export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      customer_accounts: {
        Row: {
          id: string;
          email: string;
          password_hash: string | null;
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
          loyalty_points: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["customer_accounts"]["Row"], "id" | "created_at" | "updated_at" | "loyalty_points"> & { id?: string; loyalty_points?: number };
        Update: Partial<Database["public"]["Tables"]["customer_accounts"]["Insert"]>;
      };
      ticket_orders: {
        Row: {
          id: string;
          order_number: string;
          customer_id: string | null;
          customer_email: string;
          customer_name: string;
          event_slug: string;
          event_city: string;
          ticket_type: string;
          quantity: number;
          unit_price: number;
          subtotal: number;
          discount_amount: number;
          total: number;
          coupon_code: string | null;
          stripe_session_id: string | null;
          stripe_payment_intent_id: string | null;
          status: "pending" | "paid" | "cancelled" | "refunded" | "expired";
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["ticket_orders"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["ticket_orders"]["Insert"]>;
      };
      ticket_instances: {
        Row: {
          id: string;
          order_id: string;
          ticket_number: number;
          customer_id: string | null;
          event_slug: string;
          event_city: string;
          ticket_type: string;
          holder_name: string;
          qr_code: string;
          status: "valid" | "used" | "cancelled" | "refunded";
          checked_in_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["ticket_instances"]["Row"], "id" | "created_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["ticket_instances"]["Insert"]>;
      };
      coupons: {
        Row: {
          id: string;
          code: string;
          type: "percentage" | "fixed";
          value: number;
          max_uses: number | null;
          uses: number;
          max_uses_per_customer: number;
          min_order_amount: number | null;
          max_discount_amount: number | null;
          applicable_cities: string[] | null;
          expires_at: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["coupons"]["Row"], "id" | "created_at" | "uses"> & { id?: string; uses?: number };
        Update: Partial<Database["public"]["Tables"]["coupons"]["Insert"]>;
      };
      loyalty_transactions: {
        Row: {
          id: string;
          customer_id: string;
          action_code: string;
          points: number;
          description: string | null;
          source_id: string | null;
          source_type: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["loyalty_transactions"]["Row"], "id" | "created_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["loyalty_transactions"]["Insert"]>;
      };
      media_uploads: {
        Row: {
          id: string;
          customer_id: string | null;
          event_id: string | null;
          media_type: "photo" | "video";
          file_name: string;
          dropbox_path: string;
          file_size: number | null;
          caption: string | null;
          points_awarded: number;
          status: "pending" | "approved" | "rejected";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["media_uploads"]["Row"], "id" | "created_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["media_uploads"]["Insert"]>;
      };
      social_share_claims: {
        Row: {
          id: string;
          customer_id: string | null;
          customer_email: string;
          platform: string;
          post_url: string;
          event_id: string | null;
          points_awarded: number;
          status: "pending" | "approved" | "rejected";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["social_share_claims"]["Row"], "id" | "created_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["social_share_claims"]["Insert"]>;
      };
      contact_submissions: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          subject: string;
          message: string;
          status: "new" | "read" | "replied" | "closed";
          admin_reply: string | null;
          replied_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["contact_submissions"]["Row"], "id" | "created_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["contact_submissions"]["Insert"]>;
      };
      newsletter_subscribers: {
        Row: {
          id: string;
          first_name: string | null;
          email: string;
          phone: string | null;
          subscribed_at: string;
          active: boolean;
        };
        Insert: Omit<Database["public"]["Tables"]["newsletter_subscribers"]["Row"], "id" | "subscribed_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["newsletter_subscribers"]["Insert"]>;
      };
      affiliates: {
        Row: {
          id: string;
          email: string;
          password_hash: string;
          first_name: string;
          last_name: string;
          phone: string | null;
          referral_code: string;
          commission_rate: number;
          status: "pending" | "active" | "revoked";
          payout_method: string | null;
          payout_details: string | null;
          total_clicks: number;
          total_referrals: number;
          total_earnings: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["affiliates"]["Row"], "id" | "created_at" | "total_clicks" | "total_referrals" | "total_earnings"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["affiliates"]["Insert"]>;
      };
      affiliate_clicks: {
        Row: {
          id: string;
          affiliate_id: string;
          referral_code: string;
          ip_address: string | null;
          user_agent: string | null;
          utm_source: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["affiliate_clicks"]["Row"], "id" | "created_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["affiliate_clicks"]["Insert"]>;
      };
      blog_posts: {
        Row: {
          id: string;
          slug: string;
          title: string;
          excerpt: string;
          body: string;
          category: string;
          author: string;
          image_url: string | null;
          image_alt: string | null;
          tags: string[];
          featured: boolean;
          published: boolean;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["blog_posts"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["blog_posts"]["Insert"]>;
      };
      banner_sponsors: {
        Row: {
          id: string;
          brand_name: string;
          tagline: string | null;
          tier: string;
          active: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["banner_sponsors"]["Row"], "id" | "created_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["banner_sponsors"]["Insert"]>;
      };
    };
  };
}
