import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {

  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const [stockAmount, setStockAmount] = useState(0);
  useEffect(() => {
    async function getProduct() {
      const stock = await api.get(`/stock/${1}`);
      setStockAmount(stock.data.amount)
    }
    getProduct();
  }, []);

  const getProductAmountById = async (productId: number) => {
    try {
      const response = await api.get(`/stock/${productId}`);
      return response.data.amount
    } catch {
      toast.error('Erro na requisição do produto');
      return -1;
    }
  };

  const getProductById = async (productId: number) => {
    try {
      const response = await api.get(`/products/${productId}`);
      return response.data;
    } catch {
      toast.error('Erro na requisição do produto');
      return -1;
    }
  };


  const addProduct = async (productId: number) => {
    const stockAmount = await getProductAmountById(productId);
    const newCart = [...cart];
    const product = newCart.find(product => product.id === productId);
    if (!product && Number(stockAmount) > 0) {
      const product = await getProductById(productId);
      newCart.push({
        ...product,
        amount: 1
      });
    }
    else if (product && Number(stockAmount) > (product.amount)) {
      product.amount += 1;
    }
    else {
      toast.error('Quantidade solicitada fora de estoque');
      return;
    }
    setCart(newCart);
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = [...cart];
      const productIndex = newCart.findIndex(product => product.id === productId);
      if (productIndex >= 0) {
        newCart.splice(productIndex, 1);
        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      }
      else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    if (amount <= 0)
      return;

    const stockAmount = await getProductAmountById(productId);
    console.log(stockAmount);
    console.log(amount);
    if (amount > Number(stockAmount)) {
      toast.error('Quantidade solicitada fora de estoque');
      return;
    }

    const newCart = [...cart];
    let product = newCart.find(product => product.id === productId);
    if (product) {
      product.amount = amount;
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      return;
    }
    else {
      toast.error('Erro na alteração de quantidade do produto');
      return;
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
