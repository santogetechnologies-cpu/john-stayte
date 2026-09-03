export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "customer" | "manager" | "admin";
export type OrderStatus =
  "Pending" | "Approved" | "Packed" | "Out for Delivery" | "Delivered" | "Cancelled";
export type TicketPriority = "Low" | "Medium" | "High" | "Urgent";
export type TicketStatus = "Open" | "In Progress" | "Waiting" | "Resolved";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string;
          phone: string | null;
          role: UserRole;
          status: string;
          notification_prefs: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email: string;
          phone?: string | null;
          role?: UserRole;
          status?: string;
          notification_prefs?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string;
          phone?: string | null;
          role?: UserRole;
          status?: string;
          notification_prefs?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          icon: string | null;
          description: string | null;
          subcategories: string[] | null;
          display_order: number;
          is_active: boolean;
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          icon?: string | null;
          description?: string | null;
          subcategories?: string[] | null;
          display_order?: number;
          is_active?: boolean;
          image_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          icon?: string | null;
          description?: string | null;
          subcategories?: string[] | null;
          display_order?: number;
          is_active?: boolean;
          image_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          name: string;
          slug: string;
          brand: string;
          category_id: string | null;
          category_slug: string;
          subcategory: string | null;
          description: string | null;
          price: number;
          compare_at_price: number | null;
          stock: number;
          rating: number;
          reviews_count: number;
          image_url: string | null;
          is_featured: boolean;
          is_offer: boolean;
          specs: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          brand: string;
          category_id?: string | null;
          category_slug: string;
          subcategory?: string | null;
          description?: string | null;
          price: number;
          compare_at_price?: number | null;
          stock?: number;
          rating?: number;
          reviews_count?: number;
          image_url?: string | null;
          is_featured?: boolean;
          is_offer?: boolean;
          specs?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          brand?: string;
          category_id?: string | null;
          category_slug?: string;
          subcategory?: string | null;
          description?: string | null;
          price?: number;
          compare_at_price?: number | null;
          stock?: number;
          rating?: number;
          reviews_count?: number;
          image_url?: string | null;
          is_featured?: boolean;
          is_offer?: boolean;
          specs?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      offers: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          discount_percentage: number | null;
          banner_url: string | null;
          code: string | null;
          is_active: boolean;
          starts_at: string | null;
          ends_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          discount_percentage?: number | null;
          banner_url?: string | null;
          code?: string | null;
          is_active?: boolean;
          starts_at?: string | null;
          ends_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          discount_percentage?: number | null;
          banner_url?: string | null;
          code?: string | null;
          is_active?: boolean;
          starts_at?: string | null;
          ends_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      coupons: {
        Row: {
          id: string;
          code: string;
          description: string | null;
          discount_type: string;
          discount_value: number;
          min_order_amount: number;
          max_discount: number | null;
          max_uses: number;
          used_count: number;
          per_customer_limit: number | null;
          is_active: boolean;
          starts_at: string | null;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          description?: string | null;
          discount_type?: string;
          discount_value: number;
          min_order_amount?: number;
          max_discount?: number | null;
          max_uses?: number;
          used_count?: number;
          per_customer_limit?: number | null;
          is_active?: boolean;
          starts_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          description?: string | null;
          discount_type?: string;
          discount_value?: number;
          min_order_amount?: number;
          max_discount?: number | null;
          max_uses?: number;
          used_count?: number;
          per_customer_limit?: number | null;
          is_active?: boolean;
          starts_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      cms_content_blocks: {
        Row: {
          id: string;
          section_key: string;
          title: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          section_key: string;
          title: string;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          section_key?: string;
          title?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      inventory: {
        Row: {
          id: string;
          product_id: string | null;
          current_stock: number;
          reorder_threshold: number;
          target_stock: number;
          depot_location: string | null;
          supplier: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id?: string | null;
          current_stock?: number;
          reorder_threshold?: number;
          target_stock?: number;
          depot_location?: string | null;
          supplier?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string | null;
          current_stock?: number;
          reorder_threshold?: number;
          target_stock?: number;
          depot_location?: string | null;
          supplier?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      addresses: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          full_name: string;
          street_address: string;
          city: string;
          county: string;
          postcode: string;
          phone: string | null;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label?: string;
          full_name: string;
          street_address: string;
          city: string;
          county?: string;
          postcode: string;
          phone?: string | null;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          label?: string;
          full_name?: string;
          street_address?: string;
          city?: string;
          county?: string;
          postcode?: string;
          phone?: string | null;
          is_default?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      customer_addresses: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          name: string;
          street: string;
          city: string;
          postcode: string;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label?: string;
          name: string;
          street: string;
          city: string;
          postcode: string;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          label?: string;
          name?: string;
          street?: string;
          city?: string;
          postcode?: string;
          is_default?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          customer_id: string | null;
          customer_name: string;
          customer_email: string;
          customer_phone: string | null;
          delivery_address: Json;
          subtotal: number;
          shipping_fee: number;
          total: number;
          status: OrderStatus;
          fulfillment_status: string;
          assigned_driver: string | null;
          assigned_depot: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          customer_id?: string | null;
          customer_name: string;
          customer_email: string;
          customer_phone?: string | null;
          delivery_address: Json;
          subtotal: number;
          shipping_fee?: number;
          total: number;
          status?: OrderStatus;
          fulfillment_status?: string;
          assigned_driver?: string | null;
          assigned_depot?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          customer_id?: string | null;
          customer_name?: string;
          customer_email?: string;
          customer_phone?: string | null;
          delivery_address?: Json;
          subtotal?: number;
          shipping_fee?: number;
          total?: number;
          status?: OrderStatus;
          fulfillment_status?: string;
          assigned_driver?: string | null;
          assigned_depot?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          product_name: string;
          quantity: number;
          unit_price: number;
          total_price: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          quantity: number;
          unit_price: number;
          total_price: number;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          product_name?: string;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      order_status_history: {
        Row: {
          id: string;
          order_id: string;
          status: string;
          actor_id: string | null;
          created_by: string | null;
          actor_name: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          status: string;
          actor_id?: string | null;
          created_by?: string | null;
          actor_name?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          status?: string;
          actor_id?: string | null;
          created_by?: string | null;
          actor_name?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          category: string | null;
          read: boolean;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          category?: string | null;
          read?: boolean;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          category?: string | null;
          read?: boolean;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      customer_notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          category: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          category?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          category?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      support_tickets: {
        Row: {
          id: string;
          ticket_number: string;
          customer_id: string | null;
          customer_name: string;
          customer_email: string;
          subject: string;
          category: string;
          priority: TicketPriority;
          status: TicketStatus;
          description: string | null;
          order_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          ticket_number: string;
          customer_id?: string | null;
          customer_name: string;
          customer_email: string;
          subject: string;
          category?: string;
          priority?: TicketPriority;
          status?: TicketStatus;
          description?: string | null;
          order_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          ticket_number?: string;
          customer_id?: string | null;
          customer_name?: string;
          customer_email?: string;
          subject?: string;
          category?: string;
          priority?: TicketPriority;
          status?: TicketStatus;
          description?: string | null;
          order_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      support_messages: {
        Row: {
          id: string;
          ticket_id: string;
          sender_id: string | null;
          sender_name: string;
          sender_role: string;
          message: string;
          text: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          sender_id?: string | null;
          sender_name: string;
          sender_role: string;
          message: string;
          text?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string;
          sender_id?: string | null;
          sender_name?: string;
          sender_role?: string;
          message?: string;
          text?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "support_tickets";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          id: string;
          invoice_number: string;
          order_id: string;
          customer_id: string | null;
          total_amount: number;
          status: string;
          issued_at: string;
        };
        Insert: {
          id?: string;
          invoice_number: string;
          order_id: string;
          customer_id?: string | null;
          total_amount: number;
          status?: string;
          issued_at?: string;
        };
        Update: {
          id?: string;
          invoice_number?: string;
          order_id?: string;
          customer_id?: string | null;
          total_amount?: number;
          status?: string;
          issued_at?: string;
        };
        Relationships: [];
      };
      stations: {
        Row: {
          id: string;
          name: string;
          address: string;
          town: string;
          postcode: string;
          phone: string | null;
          hours: string | null;
          services: string[] | null;
          autogas_available: boolean;
          maps_link: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address: string;
          town: string;
          postcode: string;
          phone?: string | null;
          hours?: string | null;
          services?: string[] | null;
          autogas_available?: boolean;
          maps_link?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string;
          town?: string;
          postcode?: string;
          phone?: string | null;
          hours?: string | null;
          services?: string[] | null;
          autogas_available?: boolean;
          maps_link?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      delivery_assignments: {
        Row: {
          id: string;
          order_id: string | null;
          driver_id: string | null;
          driver_name: string;
          vehicle_identifier: string;
          route_area: string;
          time_slot: string | null;
          status: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id?: string | null;
          driver_id?: string | null;
          driver_name: string;
          vehicle_identifier: string;
          route_area: string;
          time_slot?: string | null;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string | null;
          driver_id?: string | null;
          driver_name?: string;
          vehicle_identifier?: string;
          route_area?: string;
          time_slot?: string | null;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      wishlists: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      wishlist_items: {
        Row: {
          id: string;
          wishlist_id: string;
          product_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          wishlist_id: string;
          product_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          wishlist_id?: string;
          product_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          actor_name: string;
          action: string;
          target_type: string | null;
          target_id: string | null;
          metadata: Json | null;
          details?: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          actor_name: string;
          action: string;
          target_type?: string | null;
          target_id?: string | null;
          metadata?: Json | null;
          details?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          actor_name?: string;
          action?: string;
          target_type?: string | null;
          target_id?: string | null;
          metadata?: Json | null;
          details?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      cms_banners: {
        Row: {
          id: string;
          title: string;
          subtitle: string | null;
          image_url: string;
          link_url: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          subtitle?: string | null;
          image_url: string;
          link_url?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          subtitle?: string | null;
          image_url?: string;
          link_url?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cms_blog_posts: {
        Row: {
          id: string;
          title: string;
          slug: string;
          excerpt: string | null;
          content: string | null;
          image_url: string | null;
          author_name: string;
          is_published: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          excerpt?: string | null;
          content?: string | null;
          image_url?: string | null;
          author_name?: string;
          is_published?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          slug?: string;
          excerpt?: string | null;
          content?: string | null;
          image_url?: string | null;
          author_name?: string;
          is_published?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          product_id: string;
          user_id: string;
          user_name: string;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          user_id: string;
          user_name: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          user_id?: string;
          user_name?: string;
          rating?: number;
          comment?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      newsletter_subscribers: {
        Row: {
          id: string;
          email: string;
          source: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          source?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          source?: string | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      cancel_customer_order: {
        Args: {
          target_order_id: string;
          reason_text?: string;
        };
        Returns: {
          success: boolean;
          error?: string;
          message?: string;
        };
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
