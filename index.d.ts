/**
 * ### Cache with redis
 * Require **config.redis_uri**
 */
export declare const cacher: {
    /**
     * ### Cache response body by middleware
     * key `cacher:middle:{prefix}:{url.base}:${md5(url.query)}`
     * @param option Default: {expire: 173200, prefix: ''}
     * @returns middleware
     */
    middle: (option?: {
        expire?: number = 173200
        prefix?: string = ''
    }) => (req?: any, res?: any, next?: any) => void
}

export declare const config: {
    app_dir: string
    port: number
    env: string
    secret: string
    cors_origin: string
    seek_static: string
    seek_public: string
    seek_views: string
    seek_tasks: string
    seek_routers: string
    seek_events: string
    logger_transporter: string
    vanguard_detector: string
    vanguard_supervisor: string
    websocket_client: string
    websocket_emitter: string
    task_trip_max: number
    task_loop_max: number

    deferred: {
        setup: Promise<void>
        config: Promise<void>
    },
}

/**
 * ### Get auto increment value
 * Store in **Mongodb**  
 * Require **config.mongodb_uri**
 */
export declare const counter: {
    /**
     * ### Increment and return value  
     * @param key Identify key
     * @returns Value after increment
     */
    get: (key: string) => Promise<number>

    /**
     * ### Set counter value
     * @param key Identify key
     * @param value Value
     */
    set: (key: string, value: number) => Promise<void>
}

/**
 * ### Create application instance and http server
 * Server will listen on **config.port** if it set
 * 
 * @param middle Call after vangaurd and before seeking resources
 */
export declare const create: (middle?: (app: any) => void) => { app: any, server: any }

export declare const event: {
    emit: (name: string, data: any) => void
    on: (name: string, handle: (data: any) => void) => void
}

export declare const gateway: () => any

export declare const jwt: {
    sign: (data: any, option?: {
        expiresIn?: string = '1000y'
        secret?: string
    }) => Promise<string>

    verify: (token: string, option?: {
        secret?: string
    }) => Promise<any>
}

export declare const logger: {
    emerg: (message: string, playload?: any) => void
    alert: (message: string, playload?: any) => void
    crit: (message: string, playload?: any) => void
    error: (message: string, playload?: any) => void
    warn: (message: string, playload?: any) => void
    notice: (message: string, playload?: any) => void
    info: (message: string, playload?: any) => void
    debug: (message: string, playload?: any) => void
}

export declare const mongoose: {
    Schema: (schema: any, option?: any) => any
    model: (name: string, schema: any, option?: any) => any
}

export declare const query: () => any

export declare const redis: {
    client: any
    cmd: (...arg: any) => Promise<any>
    expire: (key: string, time: number) => Promise<any>
    get: (key: string) => Promise<any>
    set: (key: string, value: any, option?: any) => Promise<any>
    hset: (key: string, name: string, value: any) => Promise<any>
    hget: (key: string, name: string) => Promise<any>
    hgetall: (key: string) => Promise<any>
    hdel: (key: string, name: string) => Promise<any>
    del: (key: string) => Promise<any>
    sub: (channel: string, callback: (message: any, ...arg: any) => void) => Promise<any>
    pub: (channel: string, message: any) => Promise<any>
}

export declare const request: {
    get: (url: string, param?: any, option?: any) => Promise<any>
    post: (url: string, body?: any, option?: any) => Promise<any>
    put: (url: string, body?: any, option?: any) => Promise<any>
    patch: (url: string, body?: any, option?: any) => Promise<any>
    delete: (url: string, body?: any, option?: any) => Promise<any>
}

export declare const Router: (...params: any) => any

export declare const schedule: {
    add: (expr: string, handle: any, option?: any) => any
}

export declare const slack: {
    send: (message: string, option?: any) => Promise<any>
}

export declare const socket: {
    emit: (
        event: string,
        data: any,
        option?: {
            sid: string
            uid: string
            room: string
        },
    ) => Promise<any>
}

export declare const sheet: {
    doc: (id: string) => Promise<any>
}

/**
 * ### Handle task with kafka under the hood
 * Require **config.kafka_broker**  
 * Auto group comsumer by `serivce instance`
 */
export declare const task: {
    on: (
            name: string,
            handle: (
                data: any,
                meta: {
                    sender: string
                    trips: string[]
                    loop: number
                    timestamp: number
                }
            ) => void
        ) => void
    
    /**
     * ### Add metadata and publish message to kafka
     * @param name Topic name
     * @param data Message payload
     */
    emit: (name: string, data: any) => any
}

export declare const telegram: {
    send: (id: string, text: string) => Promise<any>
    method: (method: string, param?: any) => Promise<any>
}

/**
 * ### Create a async context with hook
 * and manage metadata with `asyncLocalStorage`
 */
export declare const tx: {
    get: (key: string) => any
    set: (key: string, value: any) => any
    init: () => (req, res, next) => void
}

export declare const ui: {
    (template: string, command?: any): any;
    
    table: (
        model: string,
        inject: {
            middleware: {
                end: any,
            },
            limit: number,
            offset: number,
            query: any,
            project: any,
            sort: any,
        },
    ) => any;
}


export declare const util: {
    deferred: () => Promise<any>
    sleep: (ms: number) => Promise<void>
    throttle: (wait?: number, trailling?: boolean = true) => any
    intersect: (target: any, destination: any) => any
    readble: (dir: string) => Promise<boolean>
    getFiles: (dir: string) => Promise<[string]>
    debounce: (fn: any, wait: number) => any
}

export declare const vanguard: {
    detect: () => (req?: any, res?: any, next?: any) => void
    supervise: () => (req?: any, res?: any, next?: any) => void
    
    supervisor: {
        tiat: () => (req, res, next) => void
        internal: () => (req, res, next) => void
        ui: () => (req, res, next) => void
        login: () => (req, res, next) => void
    }
}
