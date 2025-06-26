export type VpnInfo = {
    info: {
        status: number,
        mode: number,
        ulist: string[],
        switch: number
    },
    code: number
}

export type PostResponseData = {
    code: number;
    msg?: string
}