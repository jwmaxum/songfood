export type ServiceState={inquiries_paused:boolean;orders_paused:boolean;pi_paused:boolean;owner_id:string|null;response_minutes:number|null};
export type ServiceControls=ServiceState&{owner:string;revision:number;updated_at:string};
export type LaunchFacts={products:number;priced_products:number;exchange_ready:boolean;bank_ready:boolean;issuer_ready:boolean;private_pi_storage:boolean;notification_transport:string;mail_verified?:boolean;release_enabled?:boolean;released_products?:number;failed_notifications:number;preparing_pi:number;checked_at:string};
export type LaunchCheck={id:string;title:string;ready:boolean;detail:string;href:string};
export type LaunchStatus={controls:ServiceControls;checks:LaunchCheck[];facts:LaunchFacts;events:{revision:number;reason:string;created_at:string;before_state:ServiceControls;after_state:ServiceControls}[];manual_checks:string[];staff:import('../staff-management').StaffOption[]};
